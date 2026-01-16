import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateWorkingHourRuleSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { recalculateAllSegments } from "@/lib/services";
import { AuditAction, Role } from "@prisma/client";

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
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.workingHourRule.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== context.companyId) {
      return NextResponse.json(
        { error: "Working hour rule not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const result = updateWorkingHourRuleSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const rule = await prisma.workingHourRule.update({
      where: { id },
      data: result.data,
    });

    // Recalculate all time entry segments with new rules
    await recalculateAllSegments(context.companyId);

    // Audit log
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action: AuditAction.UPDATE,
      entityType: "WorkingHourRule",
      entityId: rule.id,
      oldValues: existing,
      newValues: rule,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Update working hour rule error:", error);
    return NextResponse.json(
      { error: "Failed to update working hour rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.workingHourRule.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== context.companyId) {
      return NextResponse.json(
        { error: "Working hour rule not found" },
        { status: 404 }
      );
    }

    // Soft delete
    const rule = await prisma.workingHourRule.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action: AuditAction.DELETE,
      entityType: "WorkingHourRule",
      entityId: rule.id,
      oldValues: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete working hour rule error:", error);
    return NextResponse.json(
      { error: "Failed to delete working hour rule" },
      { status: 500 }
    );
  }
}
