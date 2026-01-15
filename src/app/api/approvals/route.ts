import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateApprovalSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { AuditAction, Role, TimeEntryStatus } from "@prisma/client";

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

    const where: Record<string, unknown> = {
      entry: {
        companyId: context.companyId,
      },
    };

    if (status) {
      where.status = status;
    }

    const approvals = await prisma.approval.findMany({
      where,
      include: {
        entry: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            segments: {
              include: { project: true },
            },
          },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("Get approvals error:", error);
    return NextResponse.json(
      { error: "Failed to get approvals" },
      { status: 500 }
    );
  }
}
