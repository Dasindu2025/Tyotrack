import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateApprovalSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { AuditAction, Role, TimeEntryStatus } from "@prisma/client";

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

    const body = await req.json();
    const result = updateApprovalSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { status, reason } = result.data;

    // Get existing approval
    const existing = await prisma.approval.findUnique({
      where: { id },
      include: {
        entry: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    if (existing.entry.companyId !== context.companyId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get company settings to check if should auto-lock
    const settings = await prisma.companySettings.findUnique({
      where: { companyId: context.companyId },
    });

    const newEntryStatus = status === "APPROVED" && settings?.autoLockAfterApproval
      ? TimeEntryStatus.LOCKED
      : (status as TimeEntryStatus);

    // Update in transaction
    const approval = await prisma.$transaction(async (tx) => {
      // Update approval
      const updated = await tx.approval.update({
        where: { id },
        data: {
          status: status as TimeEntryStatus,
          reason,
          approvedById: context.user.userId,
          approvedAt: new Date(),
        },
        include: {
          entry: {
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
              segments: { include: { project: true } },
            },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Update entry status
      await tx.timeEntryParent.update({
        where: { id: existing.entryId },
        data: { status: newEntryStatus },
      });

      return updated;
    });

    // Audit log
    const action = status === "APPROVED" ? AuditAction.APPROVE : AuditAction.REJECT;
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action,
      entityType: "TimeEntry",
      entityId: existing.entryId,
      oldValues: { status: existing.status },
      newValues: { status, reason },
    });

    return NextResponse.json({ approval });
  } catch (error) {
    console.error("Update approval error:", error);
    return NextResponse.json(
      { error: "Failed to update approval" },
      { status: 500 }
    );
  }
}
