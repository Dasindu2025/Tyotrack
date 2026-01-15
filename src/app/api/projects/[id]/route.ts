import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateProjectSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { AuditAction, Role } from "@prisma/client";

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

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.companyId !== context.companyId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Failed to get project" }, { status: 500 });
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

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== context.companyId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updateProjectSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: result.data,
    });

    // Audit log
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action: AuditAction.UPDATE,
      entityType: "Project",
      entityId: project.id,
      oldValues: existing,
      newValues: project,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
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

    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== context.companyId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Instead of deleting, just mark as inactive
    const project = await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action: AuditAction.DELETE,
      entityType: "Project",
      entityId: project.id,
      oldValues: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
