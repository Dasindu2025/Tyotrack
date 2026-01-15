import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/services/audit";
import { AuditAction, Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    const where: Record<string, unknown> = { companyId: context.companyId };
    if (activeOnly) {
      where.isActive = true;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json({ error: "Failed to get projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create projects
    const isAdmin = context.user.roles.some((r) => 
      r === Role.COMPANY_ADMIN || r === Role.SUPER_ADMIN
    );
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createProjectSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, code, description, color } = result.data;

    // Check for duplicate name (case insensitive)
    const existing = await prisma.project.findFirst({
      where: {
        companyId: context.companyId,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        companyId: context.companyId,
        name,
        code,
        description,
        color: color || "#00f5ff",
        isActive: true,
      },
    });

    // Audit log
    await createAuditLog({
      companyId: context.companyId,
      userId: context.user.userId,
      action: AuditAction.CREATE,
      entityType: "Project",
      entityId: project.id,
      newValues: project,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
