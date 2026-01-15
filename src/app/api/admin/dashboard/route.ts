import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { Role, TimeEntryStatus } from "@prisma/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

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
    const period = searchParams.get("period") || "month";

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get time stats for different periods
    const [todaySegments, weekSegments, monthSegments] = await Promise.all([
      prisma.timeEntrySegment.findMany({
        where: {
          date: { gte: todayStart, lte: todayEnd },
          parent: { companyId: context.companyId, status: { not: "REJECTED" } },
        },
      }),
      prisma.timeEntrySegment.findMany({
        where: {
          date: { gte: weekStart, lte: weekEnd },
          parent: { companyId: context.companyId, status: { not: "REJECTED" } },
        },
      }),
      prisma.timeEntrySegment.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          parent: { companyId: context.companyId, status: { not: "REJECTED" } },
        },
        include: {
          project: true,
          parent: {
            include: {
              employee: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    // Calculate time stats
    const hoursToday = todaySegments.reduce((sum, s) => sum + s.durationMinutes, 0);
    const hoursWeek = weekSegments.reduce((sum, s) => sum + s.durationMinutes, 0);
    const hoursMonth = monthSegments.reduce((sum, s) => sum + s.durationMinutes, 0);
    const dayMinutes = monthSegments.reduce((sum, s) => sum + s.dayMinutes, 0);
    const eveningMinutes = monthSegments.reduce((sum, s) => sum + s.eveningMinutes, 0);
    const nightMinutes = monthSegments.reduce((sum, s) => sum + s.nightMinutes, 0);

    // Get counts
    const [activeEmployees, activeProjects, pendingApprovalsCount] = await Promise.all([
      prisma.user.count({
        where: { companyId: context.companyId, status: "ACTIVE" },
      }),
      prisma.project.count({
        where: { companyId: context.companyId, isActive: true },
      }),
      prisma.timeEntryParent.count({
        where: { companyId: context.companyId, status: "PENDING" },
      }),
    ]);

    // Get pending approvals (top 5)
    const pendingApprovals = await prisma.timeEntryParent.findMany({
      where: { companyId: context.companyId, status: "PENDING" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        segments: { include: { project: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Calculate top employees (by hours this month)
    const employeeHours: Record<string, { id: string; name: string; totalMinutes: number }> = {};
    for (const segment of monthSegments) {
      const emp = segment.parent.employee;
      if (!employeeHours[emp.id]) {
        employeeHours[emp.id] = { id: emp.id, name: `${emp.firstName} ${emp.lastName}`, totalMinutes: 0 };
      }
      employeeHours[emp.id].totalMinutes += segment.durationMinutes;
    }
    const topEmployees = Object.values(employeeHours)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5);

    // Calculate top projects (by hours this month)
    const projectHours: Record<string, { id: string; name: string; color: string; totalMinutes: number }> = {};
    for (const segment of monthSegments) {
      const proj = segment.project;
      if (!projectHours[proj.id]) {
        projectHours[proj.id] = { id: proj.id, name: proj.name, color: proj.color || "#00f5ff", totalMinutes: 0 };
      }
      projectHours[proj.id].totalMinutes += segment.durationMinutes;
    }
    const topProjects = Object.values(projectHours)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5);

    // Get recent activity (last 10)
    const recentActivity = await prisma.auditLog.findMany({
      where: { companyId: context.companyId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Format pending approvals for frontend
    const formattedPending = pendingApprovals.map((entry) => ({
      id: entry.id,
      employeeName: `${entry.employee.firstName} ${entry.employee.lastName}`,
      date: entry.date,
      totalMinutes: entry.segments.reduce((sum, s) => sum + s.durationMinutes, 0),
      isFullDay: entry.isFullDay,
      projects: entry.segments.map((s) => s.project.name),
    }));

    // Format activity for frontend
    const formattedActivity = recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      userName: `${log.user.firstName} ${log.user.lastName}`,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({
      stats: {
        hoursToday,
        hoursWeek,
        hoursMonth,
        activeEmployees,
        activeProjects,
        pendingApprovals: pendingApprovalsCount,
        dayMinutes,
        eveningMinutes,
        nightMinutes,
      },
      pendingApprovals: formattedPending,
      topEmployees,
      topProjects,
      recentActivity: formattedActivity,
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard data" },
      { status: 500 }
    );
  }
}
