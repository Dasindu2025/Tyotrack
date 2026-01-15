import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateCompanySettingsSchema, updateWorkingHourRuleSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { AuditAction, Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings, workingHourRules] = await Promise.all([
      prisma.companySettings.findUnique({
        where: { companyId: context.companyId },
      }),
      prisma.workingHourRule.findMany({
        where: { companyId: context.companyId },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ settings, workingHourRules });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const result = updateCompanySettingsSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    // Get existing for audit
    const existing = await prisma.companySettings.findUnique({
      where: { companyId: context.companyId },
    });

    const settings = await prisma.companySettings.upsert({
      where: { companyId: context.companyId },
      create: {
        companyId: context.companyId,
        ...result.data,
      },
      update: result.data,
    });

    // Audit log
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action: AuditAction.UPDATE,
      entityType: "CompanySettings",
      entityId: settings.id,
      oldValues: existing,
      newValues: settings,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
