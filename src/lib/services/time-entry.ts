import { prisma } from "@/lib/db";
import { TimeEntryStatus, AuditAction } from "@prisma/client";
import {
  checkOverlap,
  splitCrossMidnight,
  calculateDuration,
  calculateHourTypes,
  validateBackdateLimit,
  TimeRange,
  WorkingHourRule,
} from "@/lib/time-engine";
import { createAuditLog } from "./audit";

interface CreateTimeEntryParams {
  companyId: string;
  employeeId: string;
  createdById: string;
  projectId: string;
  date: Date;
  startTime: string;
  endTime: string;
  notes?: string;
  isFullDay?: boolean;
  skipBackdateValidation?: boolean;
}

interface UpdateTimeEntryParams {
  entryId: string;
  userId: string;
  companyId: string;
  projectId?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export async function createTimeEntry(params: CreateTimeEntryParams) {
  const {
    companyId,
    employeeId,
    createdById,
    projectId,
    date,
    startTime,
    endTime,
    notes,
    isFullDay = false,
    skipBackdateValidation = false,
  } = params;

  // Get employee profile for backdate limit
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    include: { employeeProfile: true },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  // Check backdate limit (unless admin is overriding)
  if (!skipBackdateValidation) {
    const backdateLimitDays = employee.employeeProfile?.backdateLimitDays ?? 7;
    const validation = validateBackdateLimit(date, backdateLimitDays);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
  }

  // Get working hour rules for the company
  const workingHourRules = await prisma.workingHourRule.findMany({
    where: { companyId, isActive: true },
  });

  const rules: WorkingHourRule[] = workingHourRules.map((r) => ({
    name: r.name,
    startTime: r.startTime,
    endTime: r.endTime,
  }));

  // Split cross-midnight entries
  const timeRanges = splitCrossMidnight(date, startTime, endTime);

  // Get existing entries for overlap check
  const existingSegments = await prisma.timeEntrySegment.findMany({
    where: {
      parent: {
        employeeId,
        companyId,
      },
      date: {
        in: timeRanges.map((r) => r.date),
      },
    },
    include: { parent: true },
  });

  const existingRanges: TimeRange[] = existingSegments
    .filter((s) => s.parent.status !== TimeEntryStatus.REJECTED)
    .map((s) => ({
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

  // Check for overlaps on each segment
  for (const range of timeRanges) {
    const overlapResult = checkOverlap(range, existingRanges);
    if (overlapResult.hasOverlap) {
      throw new Error(
        `Time entry overlaps with existing entry on ${range.date.toISOString().split("T")[0]}`
      );
    }
  }

  // Get company settings for approval type
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
  });

  // Determine initial status based on approval settings
  let status = TimeEntryStatus.APPROVED;
  if (settings?.approvalType === "ALL_ENTRIES") {
    status = TimeEntryStatus.PENDING;
  } else if (settings?.approvalType === "FULL_DAY_ONLY" && isFullDay) {
    status = TimeEntryStatus.PENDING;
  }

  // Create the parent entry and segments in a transaction
  const entry = await prisma.$transaction(async (tx) => {
    const parent = await tx.timeEntryParent.create({
      data: {
        companyId,
        employeeId,
        createdById,
        date,
        isFullDay,
        status,
        notes,
      },
    });

    // Create segments
    for (const range of timeRanges) {
      const duration = calculateDuration(range.startTime, range.endTime);
      const hourTypes = calculateHourTypes(range.startTime, range.endTime, rules);

      await tx.timeEntrySegment.create({
        data: {
          parentId: parent.id,
          projectId,
          date: range.date,
          startTime: range.startTime,
          endTime: range.endTime,
          durationMinutes: duration,
          dayMinutes: hourTypes.dayMinutes,
          eveningMinutes: hourTypes.eveningMinutes,
          nightMinutes: hourTypes.nightMinutes,
        },
      });
    }

    // Create approval record if pending
    if (status === TimeEntryStatus.PENDING) {
      await tx.approval.create({
        data: {
          entryId: parent.id,
          status: TimeEntryStatus.PENDING,
        },
      });
    }

    // Return with segments
    return tx.timeEntryParent.findUnique({
      where: { id: parent.id },
      include: {
        segments: { include: { project: true } },
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  });

  // Audit log
  await createAuditLog({
    companyId,
    userId: createdById,
    action: AuditAction.CREATE,
    entityType: "TimeEntry",
    entityId: entry!.id,
    newValues: entry,
  });

  return entry;
}

export async function updateTimeEntry(params: UpdateTimeEntryParams) {
  const { entryId, userId, companyId, projectId, startTime, endTime, notes } = params;

  // Get existing entry
  const existingEntry = await prisma.timeEntryParent.findUnique({
    where: { id: entryId },
    include: {
      segments: true,
      approval: true,
    },
  });

  if (!existingEntry) {
    throw new Error("Time entry not found");
  }

  if (existingEntry.companyId !== companyId) {
    throw new Error("Access denied");
  }

  // Check if entry is locked
  if (existingEntry.status === TimeEntryStatus.LOCKED) {
    throw new Error("Cannot edit a locked entry");
  }

  // Get company settings
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
  });

  // If edit requires approval
  const needsApproval = settings?.approvalType === "EDITS_ONLY" && existingEntry.status === TimeEntryStatus.APPROVED;

  // Get working hour rules
  const workingHourRules = await prisma.workingHourRule.findMany({
    where: { companyId, isActive: true },
  });

  const rules: WorkingHourRule[] = workingHourRules.map((r) => ({
    name: r.name,
    startTime: r.startTime,
    endTime: r.endTime,
  }));

  // Update in transaction
  const updatedEntry = await prisma.$transaction(async (tx) => {
    // If time changed, recalculate segments
    if (startTime && endTime) {
      // Delete existing segments
      await tx.timeEntrySegment.deleteMany({
        where: { parentId: entryId },
      });

      // Create new segments
      const timeRanges = splitCrossMidnight(existingEntry.date, startTime, endTime);

      for (const range of timeRanges) {
        const duration = calculateDuration(range.startTime, range.endTime);
        const hourTypes = calculateHourTypes(range.startTime, range.endTime, rules);

        await tx.timeEntrySegment.create({
          data: {
            parentId: entryId,
            projectId: projectId || existingEntry.segments[0]?.projectId || "",
            date: range.date,
            startTime: range.startTime,
            endTime: range.endTime,
            durationMinutes: duration,
            dayMinutes: hourTypes.dayMinutes,
            eveningMinutes: hourTypes.eveningMinutes,
            nightMinutes: hourTypes.nightMinutes,
          },
        });
      }
    } else if (projectId) {
      // Just update project on all segments
      await tx.timeEntrySegment.updateMany({
        where: { parentId: entryId },
        data: { projectId },
      });
    }

    // Update parent status if needed
    const newStatus = needsApproval ? TimeEntryStatus.PENDING : existingEntry.status;

    const updated = await tx.timeEntryParent.update({
      where: { id: entryId },
      data: {
        notes: notes ?? existingEntry.notes,
        status: newStatus,
      },
      include: {
        segments: { include: { project: true } },
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Update or create approval if needed
    if (needsApproval) {
      await tx.approval.upsert({
        where: { entryId },
        create: {
          entryId,
          status: TimeEntryStatus.PENDING,
        },
        update: {
          status: TimeEntryStatus.PENDING,
          approvedAt: null,
          approvedById: null,
          reason: null,
        },
      });
    }

    return updated;
  });

  // Audit log
  await createAuditLog({
    companyId,
    userId,
    action: AuditAction.UPDATE,
    entityType: "TimeEntry",
    entityId: entryId,
    oldValues: existingEntry,
    newValues: updatedEntry,
  });

  return updatedEntry;
}

export async function deleteTimeEntry(entryId: string, userId: string, companyId: string) {
  const entry = await prisma.timeEntryParent.findUnique({
    where: { id: entryId },
    include: { segments: true },
  });

  if (!entry) {
    throw new Error("Time entry not found");
  }

  if (entry.companyId !== companyId) {
    throw new Error("Access denied");
  }

  if (entry.status === TimeEntryStatus.LOCKED) {
    throw new Error("Cannot delete a locked entry");
  }

  await prisma.timeEntryParent.delete({
    where: { id: entryId },
  });

  // Audit log
  await createAuditLog({
    companyId,
    userId,
    action: AuditAction.DELETE,
    entityType: "TimeEntry",
    entityId: entryId,
    oldValues: entry,
  });
}

export async function getTimeEntries(
  companyId: string,
  options?: {
    employeeId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: TimeEntryStatus;
    limit?: number;
    offset?: number;
  }
) {
  const where: Record<string, unknown> = { companyId };

  if (options?.employeeId) {
    where.employeeId = options.employeeId;
  }
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.startDate || options?.endDate) {
    where.date = {};
    if (options?.startDate) {
      (where.date as Record<string, Date>).gte = options.startDate;
    }
    if (options?.endDate) {
      (where.date as Record<string, Date>).lte = options.endDate;
    }
  }

  // If projectId filter, we need to filter through segments
  const segmentWhere = options?.projectId ? { projectId: options.projectId } : undefined;

  const [entries, total] = await Promise.all([
    prisma.timeEntryParent.findMany({
      where,
      include: {
        segments: {
          where: segmentWhere,
          include: { project: true },
        },
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approval: true,
      },
      orderBy: { date: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.timeEntryParent.count({ where }),
  ]);

  // Filter out entries without matching segments if projectId was specified
  const filteredEntries = options?.projectId
    ? entries.filter((e) => e.segments.length > 0)
    : entries;

  return { entries: filteredEntries, total };
}

export async function getTimeEntryById(entryId: string, companyId: string) {
  const entry = await prisma.timeEntryParent.findUnique({
    where: { id: entryId },
    include: {
      segments: { include: { project: true } },
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      approval: {
        include: {
          approvedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!entry || entry.companyId !== companyId) {
    return null;
  }

  return entry;
}
