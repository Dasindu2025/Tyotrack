import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { createWorkingHourRuleSchema, updateWorkingHourRuleSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { AuditAction, Role } from "@prisma/client";

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
    const result = createWorkingHourRuleSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const rule = await prisma.workingHourRule.create({
      data: {
        companyId: context.companyId,
        ...result.data,
        isActive: true,
      },
    });

    // Audit log
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action: AuditAction.CREATE,
      entityType: "WorkingHourRule",
      entityId: rule.id,
      newValues: rule,
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("Create working hour rule error:", error);
    return NextResponse.json(
      { error: "Failed to create working hour rule" },
      { status: 500 }
    );
  }
}
