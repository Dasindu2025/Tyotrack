import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { reportFiltersSchema } from "@/lib/validations";
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId");
    const projectId = searchParams.get("projectId");

    // Validate filters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Regular employees can only see their own reports
    const effectiveEmployeeId = isAdmin && employeeId 
      ? employeeId : context.user.userId;

    // Build segment where clause
    const segmentWhere: Record<string, unknown> = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      parent: {
        companyId: context.companyId,
        employeeId: effectiveEmployeeId,
        status: { not: "REJECTED" },
      },
    };

    if (projectId) {
      segmentWhere.projectId = projectId;
    }

    // Get all segments in range
    const segments = await prisma.timeEntrySegment.findMany({
      where: segmentWhere,
      include: {
        project: true,
        parent: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // Calculate totals
    const totals = {
      totalMinutes: 0,
      dayMinutes: 0,
      eveningMinutes: 0,
      nightMinutes: 0,
      byEmployee: {} as Record<string, {
        name: string;
        totalMinutes: number;
        dayMinutes: number;
        eveningMinutes: number;
        nightMinutes: number;
      }>,
      byProject: {} as Record<string, {
        name: string;
        color: string;
        totalMinutes: number;
        dayMinutes: number;
        eveningMinutes: number;
        nightMinutes: number;
      }>,
      byDate: {} as Record<string, {
        totalMinutes: number;
        dayMinutes: number;
        eveningMinutes: number;
        nightMinutes: number;
      }>,
    };

    for (const segment of segments) {
      // Overall totals
      totals.totalMinutes += segment.durationMinutes;
      totals.dayMinutes += segment.dayMinutes;
      totals.eveningMinutes += segment.eveningMinutes;
      totals.nightMinutes += segment.nightMinutes;

      // By employee
      const empId = segment.parent.employee.id;
      const empName = `${segment.parent.employee.firstName} ${segment.parent.employee.lastName}`;
      if (!totals.byEmployee[empId]) {
        totals.byEmployee[empId] = {
          name: empName,
          totalMinutes: 0,
          dayMinutes: 0,
          eveningMinutes: 0,
          nightMinutes: 0,
        };
      }
      totals.byEmployee[empId].totalMinutes += segment.durationMinutes;
      totals.byEmployee[empId].dayMinutes += segment.dayMinutes;
      totals.byEmployee[empId].eveningMinutes += segment.eveningMinutes;
      totals.byEmployee[empId].nightMinutes += segment.nightMinutes;

      // By project
      const projId = segment.project.id;
      if (!totals.byProject[projId]) {
        totals.byProject[projId] = {
          name: segment.project.name,
          color: segment.project.color || "#00f5ff",
          totalMinutes: 0,
          dayMinutes: 0,
          eveningMinutes: 0,
          nightMinutes: 0,
        };
      }
      totals.byProject[projId].totalMinutes += segment.durationMinutes;
      totals.byProject[projId].dayMinutes += segment.dayMinutes;
      totals.byProject[projId].eveningMinutes += segment.eveningMinutes;
      totals.byProject[projId].nightMinutes += segment.nightMinutes;

      // By date
      const dateKey = segment.date.toISOString().split("T")[0];
      if (!totals.byDate[dateKey]) {
        totals.byDate[dateKey] = {
          totalMinutes: 0,
          dayMinutes: 0,
          eveningMinutes: 0,
          nightMinutes: 0,
        };
      }
      totals.byDate[dateKey].totalMinutes += segment.durationMinutes;
      totals.byDate[dateKey].dayMinutes += segment.dayMinutes;
      totals.byDate[dateKey].eveningMinutes += segment.eveningMinutes;
      totals.byDate[dateKey].nightMinutes += segment.nightMinutes;
    }

    return NextResponse.json({
      segments,
      totals,
      filters: {
        startDate,
        endDate,
        employeeId: effectiveEmployeeId,
        projectId,
      },
    });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
