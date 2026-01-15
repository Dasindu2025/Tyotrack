import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateUserSchema, updateEmployeeProfileSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { AuditAction, Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        status: true,
        companyId: true,
        lastLoginAt: true,
        createdAt: true,
        employeeProfile: true,
      },
    });

    if (!user || user.companyId !== context.companyId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );

    const { id } = await params;

    // Users can update themselves, admins can update anyone
    if (!isAdmin && id !== context.user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });

    if (!existing || existing.companyId !== context.companyId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    
    // Handle user update
    const userResult = updateUserSchema.safeParse(body);
    if (!userResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: userResult.error.flatten() },
        { status: 400 }
      );
    }

    // Handle employee profile update
    const profileResult = updateEmployeeProfileSchema.safeParse(body.employeeProfile || {});
    
    // Track backdate limit change for audit
    const oldBackdateDays = existing.employeeProfile?.backdateLimitDays;
    const newBackdateDays = profileResult.success ? profileResult.data.backdateLimitDays : undefined;
    const backdateLimitChanged = newBackdateDays !== undefined && newBackdateDays !== oldBackdateDays;

    const user = await prisma.$transaction(async (tx) => {
      // Update user
      const updated = await tx.user.update({
        where: { id },
        data: {
          firstName: userResult.data.firstName,
          lastName: userResult.data.lastName,
          status: userResult.data.status,
          roles: userResult.data.roles as Role[] | undefined,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          status: true,
          employeeProfile: true,
        },
      });

      // Update employee profile if provided
      if (profileResult.success && Object.keys(profileResult.data).length > 0) {
        await tx.employeeProfile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            ...profileResult.data,
          },
          update: profileResult.data,
        });
      }

      return updated;
    });

    // Audit log for backdate limit change
    if (backdateLimitChanged && isAdmin) {
      await createAuditLog({
        companyId: context.companyId,
        userId: context.user.userId,
        action: AuditAction.UPDATE,
        entityType: "BackdateLimit",
        entityId: id,
        oldValues: { backdateLimitDays: oldBackdateDays },
        newValues: { backdateLimitDays: newBackdateDays },
      });
    }

    // Fetch updated user with profile
    const finalUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        status: true,
        employeeProfile: true,
      },
    });

    return NextResponse.json({ user: finalUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
