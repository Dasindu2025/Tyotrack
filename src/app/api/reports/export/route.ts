import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { Role } from "@prisma/client";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );

    const body = await req.json();
    const { startDate, endDate, employeeId, projectId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

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

    // Get all segments
    const segments = await prisma.timeEntrySegment.findMany({
      where: segmentWhere,
      include: {
        project: true,
        parent: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: [
        { parent: { employee: { lastName: "asc" } } },
        { date: "asc" },
        { startTime: "asc" },
      ],
    });

    // Generate CSV content
    const headers = [
      "Date",
      "Employee",
      "Email",
      "Project",
      "Start Time",
      "End Time",
      "Total Minutes",
      "Day Minutes",
      "Evening Minutes",
      "Night Minutes",
    ];

    const rows = segments.map((seg) => [
      format(new Date(seg.date), "yyyy-MM-dd"),
      `${seg.parent.employee.firstName} ${seg.parent.employee.lastName}`,
      seg.parent.employee.email,
      seg.project.name,
      seg.startTime,
      seg.endTime,
      seg.durationMinutes.toString(),
      seg.dayMinutes.toString(),
      seg.eveningMinutes.toString(),
      seg.nightMinutes.toString(),
    ]);

    // Add totals row
    const totalRow = [
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      segments.reduce((sum, s) => sum + s.durationMinutes, 0).toString(),
      segments.reduce((sum, s) => sum + s.dayMinutes, 0).toString(),
      segments.reduce((sum, s) => sum + s.eveningMinutes, 0).toString(),
      segments.reduce((sum, s) => sum + s.nightMinutes, 0).toString(),
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      totalRow.map((cell) => `"${cell}"`).join(","),
    ].join("\n");

    // Return CSV as download
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="time-report-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}
