import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error("Error fetching student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      email,
      studentId,
      yearLevel,
      course,
      college,
      firstName,
      lastName,
      middleName
    } = body

    // Validate student ID is numeric
    if (!/^\d+$/.test(studentId)) {
      return NextResponse.json({ error: "Student ID must contain only numbers" }, { status: 400 })
    }

    // Find the existing student
    const existingStudent = await prisma.student.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check if email is being changed and if new email already exists
    if (email !== existingStudent.email) {
      const emailExists = await prisma.user.findFirst({
        where: { 
          email
        }
      })

      if (emailExists && emailExists.id !== existingStudent.userId) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 })
      }
    }

    // Check if student ID is being changed and if new student ID already exists
    if (studentId !== existingStudent.studentId) {
      const studentIdExists = await prisma.student.findFirst({
        where: { 
          studentId
        }
      })

      if (studentIdExists && studentIdExists.id !== params.id) {
        return NextResponse.json({ error: "Student ID already exists" }, { status: 400 })
      }
    }

    // Construct full name from parts or use provided name
    const fullName = name || `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim()

    // Update user (no password update for OAuth users)
    const updatedUser = await prisma.user.update({
      where: { id: existingStudent.userId },
      data: {
        email,
        name: fullName,
        // Password is not updated for OAuth-only users
      }
    })

    // Update student record (without phone number, address, and section)
    const updatedStudent = await prisma.student.update({
      where: { id: params.id },
      data: {
        studentId,
        name: fullName,
        email,
        yearLevel,
        course,
        college,
      } as any,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          }
        }
      }
    })

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error("Error updating student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the student to get the user ID
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Delete all associated records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete attendance records (including soft-deleted ones)
      await tx.attendance.deleteMany({
        where: { 
          studentId: params.id,
          OR: [
            { deletedAt: null },
            { deletedAt: { not: null } }
          ]
        }
      })

      // Delete payment records (including soft-deleted ones)
      await tx.payment.deleteMany({
        where: { 
          studentId: params.id,
          OR: [
            { deletedAt: null },
            { deletedAt: { not: null } }
          ]
        }
      })

      // Delete student record (force delete even if soft-deleted)
      await tx.student.delete({
        where: { id: params.id }
      })

      // Finally delete the user record (force delete even if soft-deleted)
      await tx.user.delete({
        where: { id: student.userId }
      })
    })

    return NextResponse.json({ message: "Student and all associated records permanently deleted" })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 