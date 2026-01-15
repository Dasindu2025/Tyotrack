import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createTimeEntrySchema } from "@/lib/validations";
import { createTimeEntry, getTimeEntries } from "@/lib/services";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Regular employees can only see their own entries
    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );

    const effectiveEmployeeId = isAdmin && employeeId 
      ? employeeId 
      : context.user.userId;

    const result = await getTimeEntries(context.companyId, {
      employeeId: effectiveEmployeeId,
      projectId: projectId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status as any || undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get time entries error:", error);
    return NextResponse.json(
      { error: "Failed to get time entries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createTimeEntrySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { date, projectId, startTime, endTime, notes, isFullDay } = result.data;

    // Check if admin is creating for another employee
    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    
    const employeeId = body.employeeId && isAdmin 
      ? body.employeeId 
      : context.user.userId;

    const entry = await createTimeEntry({
      companyId: context.companyId,
      employeeId,
      createdById: context.user.userId,
      projectId,
      date: new Date(date),
      startTime,
      endTime,
      notes,
      isFullDay,
      skipBackdateValidation: isAdmin,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error: any) {
    console.error("Create time entry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create time entry" },
      { status: 400 }
    );
  }
}
