import { z } from "zod"

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Event schemas
export const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["ACADEMIC", "EXTRACURRICULAR", "MEETING", "SEMINAR", "WORKSHOP", "OTHER"], {
    required_error: "Event type is required",
  }),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  maxCapacity: z.number().positive().optional(),
  semester: z.string().optional(),
  schoolYear: z.string().optional(),
})

export type EventFormData = z.infer<typeof eventSchema>

// Student schemas - Updated for OAuth-only authentication
export const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  studentId: z.string().regex(/^\d+$/, "Student ID must contain only numbers"),
  email: z.string().email("Invalid email address"),
  yearLevel: z.enum(["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4"]),
  course: z.string().min(1, "Course is required"),
  college: z.string().min(1, "College is required"),
})

// Student form schema with separate name fields
export const studentFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  studentId: z.string().regex(/^\d+$/, "Student ID must contain only numbers"),
  email: z.string().email("Invalid email address"),
  yearLevel: z.enum(["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4"]),
  course: z.string().min(1, "Course is required"),
  college: z.string().min(1, "College is required"),
})

export type StudentFormData = z.infer<typeof studentFormSchema>

// For backward compatibility with batch import (keeping optional password)
export const studentImportSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  studentId: z.string().regex(/^\d+$/, "Student ID must contain only numbers"),
  email: z.string().email("Invalid email address"),
  yearLevel: z.enum(["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4"]),
  course: z.string().min(1, "Course is required"),
  college: z.string().min(1, "College is required"),
  password: z.string().optional(), // Optional for backward compatibility
})

export type StudentImportData = z.infer<typeof studentImportSchema>

// Fee schemas
export const feeSchema = z.object({
  name: z.string().min(1, "Fee name is required"),
  type: z.enum(["ORGANIZATION_FEE", "ACTIVITY_FEE", "REGISTRATION_FEE", "LABORATORY_FEE", "LIBRARY_FEE", "OTHER"]),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  semester: z.string().optional(),
  schoolYear: z.string().min(1, "School year is required"),
})

export type FeeFormData = z.infer<typeof feeSchema>

// Payment schemas
export const paymentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  feeId: z.string().min(1, "Fee is required"),
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type PaymentFormData = z.infer<typeof paymentSchema>

// Attendance schemas
export const attendanceSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  eventId: z.string().min(1, "Event is required"),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  notes: z.string().optional(),
})

export type AttendanceFormData = z.infer<typeof attendanceSchema> 