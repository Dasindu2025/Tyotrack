import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { updateTimeEntrySchema } from "@/lib/validations";
import { 
  getTimeEntryById, 
  updateTimeEntry, 
  deleteTimeEntry 
} from "@/lib/services";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const entry = await getTimeEntryById(id, context.companyId);

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Check access
    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    
    if (!isAdmin && entry.employeeId !== context.user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Get time entry error:", error);
    return NextResponse.json(
      { error: "Failed to get time entry" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if entry exists and user has access
    const existing = await getTimeEntryById(id, context.companyId);
    
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    
    if (!isAdmin && existing.employeeId !== context.user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateTimeEntrySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const entry = await updateTimeEntry({
      entryId: id,
      userId: context.user.userId,
      companyId: context.companyId,
      ...result.data,
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error("Update time entry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update time entry" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if entry exists and user has access
    const existing = await getTimeEntryById(id, context.companyId);
    
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    
    if (!isAdmin && existing.employeeId !== context.user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await deleteTimeEntry(id, context.user.userId, context.companyId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete time entry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete time entry" },
      { status: 400 }
    );
  }
}
