import { z } from "zod"

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Student schemas
export const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  studentId: z.string().min(1, "Student ID is required"),
  email: z.string().email("Invalid email address"),
  yearLevel: z.enum(["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR", "FOURTH_YEAR", "GRADUATE"]),
  section: z.string().min(1, "Section is required"),
  course: z.string().min(1, "Course is required"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
})

// Student import schema with password
export const studentImportSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  studentId: z.string().min(1, "Student ID is required"),
  email: z.string().email("Invalid email address"),
  yearLevel: z.enum(["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR", "FOURTH_YEAR", "GRADUATE"]),
  section: z.string().min(1, "Section is required"),
  course: z.string().min(1, "Course is required"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  password: z.string().optional(),
})

// Event schemas
export const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["ACADEMIC", "EXTRACURRICULAR", "MEETING", "SEMINAR", "WORKSHOP", "OTHER"]),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  maxCapacity: z.number().min(1).optional(),
  semester: z.string().optional(),
  schoolYear: z.string().optional(),
})

// Fee schemas
export const feeSchema = z.object({
  name: z.string().min(1, "Fee name is required"),
  type: z.enum(["ORGANIZATION_FEE", "ACTIVITY_FEE", "REGISTRATION_FEE", "LABORATORY_FEE", "LIBRARY_FEE", "OTHER"]),
  amount: z.number().min(0, "Amount must be positive"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  semester: z.string().optional(),
  schoolYear: z.string().min(1, "School year is required"),
})

// Payment schemas
export const paymentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  feeId: z.string().min(1, "Fee is required"),
  amount: z.number().min(0, "Amount must be positive"),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// Attendance schemas
export const attendanceSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  eventId: z.string().min(1, "Event is required"),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  notes: z.string().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type StudentFormData = z.infer<typeof studentSchema>
export type StudentImportFormData = z.infer<typeof studentImportSchema>
export type EventFormData = z.infer<typeof eventSchema>
export type FeeFormData = z.infer<typeof feeSchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type AttendanceFormData = z.infer<typeof attendanceSchema> 