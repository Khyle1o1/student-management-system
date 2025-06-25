import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { studentImportSchema } from "@/lib/validations"
import { z } from "zod"

interface StudentImportData {
  name: string
  studentId: string
  email: string
  yearLevel: string
  section: string
  course: string
  phoneNumber?: string
  address?: string
  password?: string
}

interface ImportResult {
  successCount: number
  errorCount: number
  duplicates: string[]
  errors: Array<{
    studentId: string
    error: string
  }>
}

const batchStudentSchema = z.object({
  students: z.array(studentImportSchema)
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const validation = batchStudentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid data format", 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { students } = validation.data
    const result: ImportResult = {
      successCount: 0,
      errorCount: 0,
      duplicates: [],
      errors: []
    }

    // Check for duplicates in the database and within the batch
    const studentIds = students.map(s => s.studentId)
    const emails = students.map(s => s.email)
    
    // Check existing students (excluding soft-deleted)
    const existingStudents = await prisma.student.findMany({
      where: {
        AND: [
          {
            OR: [
              { studentId: { in: studentIds } },
              { email: { in: emails } }
            ]
          },
          { deletedAt: null },
          // Extra safety: exclude records that end with deletion suffix
          {
            NOT: {
              OR: [
                { studentId: { endsWith: "_deleted" } },
                { email: { endsWith: "_deleted" } }
              ]
            }
          }
        ]
      },
      select: {
        studentId: true,
        email: true
      }
    })

    const existingStudentIds = new Set(existingStudents.map(s => s.studentId))
    const existingEmails = new Set(existingStudents.map(s => s.email))

    // Check existing users by email (excluding soft-deleted)
    const existingUsers = await prisma.user.findMany({
      where: {
        email: { in: emails },
        deletedAt: null,
        // Extra safety: exclude emails that end with deletion suffix
        NOT: {
          email: {
            endsWith: "_deleted"
          }
        }
      },
      select: {
        email: true
      }
    })

    const existingUserEmails = new Set(existingUsers.map(u => u.email))

    // Check for duplicates within the batch
    const batchStudentIds = new Set<string>()
    const batchEmails = new Set<string>()
    const duplicatesInBatch = new Set<string>()

    students.forEach(student => {
      if (batchStudentIds.has(student.studentId)) {
        duplicatesInBatch.add(student.studentId)
      } else {
        batchStudentIds.add(student.studentId)
      }

      if (batchEmails.has(student.email)) {
        duplicatesInBatch.add(student.email)
      } else {
        batchEmails.add(student.email)
      }
    })

    // Process each student
    for (const studentData of students) {
      try {
        // Check for duplicates
        if (existingStudentIds.has(studentData.studentId)) {
          result.duplicates.push(studentData.studentId)
          continue
        }

        if (existingEmails.has(studentData.email) || existingUserEmails.has(studentData.email)) {
          result.duplicates.push(studentData.email)
          continue
        }

        if (duplicatesInBatch.has(studentData.studentId) || duplicatesInBatch.has(studentData.email)) {
          result.duplicates.push(studentData.studentId)
          continue
        }

        // Hash password
        const password = studentData.password || 'student123'
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create user first
        const user = await prisma.user.create({
          data: {
            email: studentData.email.toLowerCase(),
            password: hashedPassword,
            role: "STUDENT",
            name: studentData.name,
          }
        })

        // Create student record
        await prisma.student.create({
          data: {
            studentId: studentData.studentId,
            userId: user.id,
            name: studentData.name,
            email: studentData.email.toLowerCase(),
            yearLevel: studentData.yearLevel as any,
            section: studentData.section,
            course: studentData.course,
          }
        })

        result.successCount++

        // Add to sets to prevent duplicates in subsequent iterations
        existingStudentIds.add(studentData.studentId)
        existingEmails.add(studentData.email.toLowerCase())
        existingUserEmails.add(studentData.email.toLowerCase())

      } catch (error) {
        console.error(`Error creating student ${studentData.studentId}:`, error)
        result.errorCount++
        result.errors.push({
          studentId: studentData.studentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error("Error in batch import:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 