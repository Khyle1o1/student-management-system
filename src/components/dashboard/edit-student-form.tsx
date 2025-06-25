"use client"

import { StudentForm } from "./student-form"

interface EditStudentFormProps {
  studentId: string
  initialData: {
    id: string
    studentId: string
    firstName: string
    lastName: string
    middleName?: string
    email: string
    yearLevel: string
    section: string
    course: string
    college: string
    phoneNumber?: string
    address?: string
  }
}

export function EditStudentForm({ studentId, initialData }: EditStudentFormProps) {
  return <StudentForm studentId={studentId} initialData={initialData} />
} 