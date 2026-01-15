import { PrismaClient, Role, UserStatus, ApprovalType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create Super Admin (no company)
  const superAdminPassword = await bcrypt.hash("Super123!", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@tyotrack.com" },
    update: {},
    create: {
      email: "superadmin@tyotrack.com",
      passwordHash: superAdminPassword,
      firstName: "Super",
      lastName: "Admin",
      roles: [Role.SUPER_ADMIN],
      status: UserStatus.ACTIVE,
    },
  });
  console.log("✅ Created Super Admin:", superAdmin.email);

  // Create Demo Company
  const company = await prisma.company.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "Demo Company",
      slug: "demo-company",
      isActive: true,
    },
  });
  console.log("✅ Created Company:", company.name);

  // Create Company Settings
  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      approvalType: ApprovalType.NONE,
      defaultBackdateDays: 7,
      standardWorkingHours: 8,
      autoLockAfterApproval: true,
    },
  });
  console.log("✅ Created Company Settings");

  // Create Working Hour Rules
  const workingHourRules = [
    { name: "Day", startTime: "08:00", endTime: "18:00", multiplier: 1.0 },
    { name: "Evening", startTime: "18:00", endTime: "22:00", multiplier: 1.25 },
    { name: "Night", startTime: "22:00", endTime: "08:00", multiplier: 1.5 },
  ];

  for (const rule of workingHourRules) {
    await prisma.workingHourRule.upsert({
      where: { 
        id: `${company.id}-${rule.name}` 
      },
      update: {},
      create: {
        id: `${company.id}-${rule.name}`,
        companyId: company.id,
        name: rule.name,
        startTime: rule.startTime,
        endTime: rule.endTime,
        multiplier: rule.multiplier,
        isActive: true,
      },
    });
  }
  console.log("✅ Created Working Hour Rules");

  // Create Company Admin
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      roles: [Role.COMPANY_ADMIN],
      status: UserStatus.ACTIVE,
      companyId: company.id,
    },
  });
  console.log("✅ Created Company Admin:", admin.email);

  // Create Employee Profile for Admin (optional)
  await prisma.employeeProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      backdateLimitDays: 30,
      department: "Management",
      position: "Administrator",
    },
  });

  // Create Employee User
  const employeePassword = await bcrypt.hash("Employee123!", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@demo.com" },
    update: {},
    create: {
      email: "employee@demo.com",
      passwordHash: employeePassword,
      firstName: "John",
      lastName: "Doe",
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      companyId: company.id,
    },
  });
  console.log("✅ Created Employee:", employee.email);

  // Create Employee Profile
  await prisma.employeeProfile.upsert({
    where: { userId: employee.id },
    update: {},
    create: {
      userId: employee.id,
      employeeCode: "EMP001",
      backdateLimitDays: 7,
      department: "Engineering",
      position: "Software Developer",
      hireDate: new Date("2024-01-15"),
    },
  });
  console.log("✅ Created Employee Profile");

  // Create another employee
  const employee2Password = await bcrypt.hash("Employee123!", 12);
  const employee2 = await prisma.user.upsert({
    where: { email: "jane@demo.com" },
    update: {},
    create: {
      email: "jane@demo.com",
      passwordHash: employee2Password,
      firstName: "Jane",
      lastName: "Smith",
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      companyId: company.id,
    },
  });

  await prisma.employeeProfile.upsert({
    where: { userId: employee2.id },
    update: {},
    create: {
      userId: employee2.id,
      employeeCode: "EMP002",
      backdateLimitDays: 3,
      department: "Design",
      position: "UI/UX Designer",
      hireDate: new Date("2024-03-01"),
    },
  });
  console.log("✅ Created Employee 2:", employee2.email);

  // Create Projects
  const projects = [
    { name: "Website Redesign", code: "WEB", color: "#00f5ff", description: "Company website redesign project" },
    { name: "Mobile App", code: "MOB", color: "#bf00ff", description: "iOS and Android mobile application" },
    { name: "API Development", code: "API", color: "#00ff8c", description: "Backend API development" },
    { name: "Internal Tools", code: "INT", color: "#ff8c00", description: "Internal tools and automation" },
    { name: "Client Support", code: "SUP", color: "#ff00f5", description: "Client support and maintenance" },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { 
        companyId_name: {
          companyId: company.id,
          name: project.name,
        }
      },
      update: {},
      create: {
        companyId: company.id,
        name: project.name,
        code: project.code,
        color: project.color,
        description: project.description,
        isActive: true,
      },
    });
  }
  console.log("✅ Created Projects");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📝 Login Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Super Admin:  superadmin@tyotrack.com / Super123!");
  console.log("Admin:        admin@demo.com / Admin123!");
  console.log("Employee 1:   employee@demo.com / Employee123!");
  console.log("Employee 2:   jane@demo.com / Employee123!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
