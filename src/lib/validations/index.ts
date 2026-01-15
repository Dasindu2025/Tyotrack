import { z } from "zod";

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

// Company Schemas
export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  slug: z.string().min(1, "Company slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

// User Schemas
export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  roles: z.array(z.enum(["SUPER_ADMIN", "COMPANY_ADMIN", "EMPLOYEE"])),
  companyId: z.string().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  roles: z.array(z.enum(["SUPER_ADMIN", "COMPANY_ADMIN", "EMPLOYEE"])).optional(),
});

// Employee Profile Schemas
export const updateEmployeeProfileSchema = z.object({
  backdateLimitDays: z.number().min(0).max(365).optional(),
  employeeCode: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

// Project Schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  isActive: z.boolean().optional(),
});

// Time Entry Schemas
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$|^24:00$/;

export const createTimeEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  projectId: z.string().min(1, "Project is required"),
  startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
  notes: z.string().optional(),
  isFullDay: z.boolean().optional().default(false),
});

export const updateTimeEntrySchema = z.object({
  projectId: z.string().optional(),
  startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional(),
  endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional(),
  notes: z.string().optional(),
});

// Approval Schemas
export const updateApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().optional(),
});

// Working Hour Rule Schemas
export const createWorkingHourRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
  multiplier: z.number().min(1).max(3).optional().default(1),
});

export const updateWorkingHourRuleSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional(),
  endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional(),
  multiplier: z.number().min(1).max(3).optional(),
  isActive: z.boolean().optional(),
});

// Company Settings Schemas
export const updateCompanySettingsSchema = z.object({
  approvalType: z.enum(["ALL_ENTRIES", "FULL_DAY_ONLY", "EDITS_ONLY", "NONE"]).optional(),
  defaultBackdateDays: z.number().min(0).max(365).optional(),
  standardWorkingHours: z.number().min(1).max(24).optional(),
  autoLockAfterApproval: z.boolean().optional(),
});

// Report Schemas
export const reportFiltersSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  employeeId: z.string().optional(),
  projectId: z.string().optional(),
});

// Export type helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateEmployeeProfileInput = z.infer<typeof updateEmployeeProfileSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type UpdateApprovalInput = z.infer<typeof updateApprovalSchema>;
export type CreateWorkingHourRuleInput = z.infer<typeof createWorkingHourRuleSchema>;
export type UpdateWorkingHourRuleInput = z.infer<typeof updateWorkingHourRuleSchema>;
export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;
export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;
