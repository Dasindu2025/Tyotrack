import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getAuditLogs } from "@/lib/services/audit";
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
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const result = await getAuditLogs(context.companyId, {
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      userId: userId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to get audit logs" },
      { status: 500 }
    );
  }
}
