import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";

interface AuditLogParams {
  companyId?: string | null;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  return prisma.auditLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues ? JSON.parse(JSON.stringify(params.oldValues)) : null,
      newValues: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function getAuditLogs(
  companyId: string,
  options?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const where: Record<string, unknown> = { companyId };

  if (options?.entityType) {
    where.entityType = options.entityType;
  }
  if (options?.entityId) {
    where.entityId = options.entityId;
  }
  if (options?.userId) {
    where.userId = options.userId;
  }
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options?.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate;
    }
    if (options?.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
