import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { createUserSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const role = searchParams.get("role");

    const where: Record<string, unknown> = { companyId: context.companyId };
    if (status) {
      where.status = status;
    }
    if (role) {
      where.roles = { has: role };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        employeeProfile: true,
      },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createUserSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, roles } = result.data;

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Get company settings for default backdate days
    const settings = await prisma.companySettings.findUnique({
      where: { companyId: context.companyId },
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roles: roles as Role[],
        companyId: context.companyId,
        status: "ACTIVE",
        employeeProfile: {
          create: {
            backdateLimitDays: settings?.defaultBackdateDays ?? 7,
          },
        },
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

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
