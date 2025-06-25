import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

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
      password,
      studentId,
      yearLevel,
      section,
      course,
      phoneNumber,
      address
    } = body

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
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists && emailExists.id !== existingStudent.userId) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 })
      }
    }

    // Check if student ID is being changed and if new student ID already exists
    if (studentId !== existingStudent.studentId) {
      const studentIdExists = await prisma.student.findUnique({
        where: { studentId }
      })

      if (studentIdExists && studentIdExists.id !== params.id) {
        return NextResponse.json({ error: "Student ID already exists" }, { status: 400 })
      }
    }

    // Update user
    const userUpdateData: any = {
      email,
      name,
    }

    // Only update password if provided
    if (password && password.trim() !== "") {
      userUpdateData.password = await bcrypt.hash(password, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id: existingStudent.userId },
      data: userUpdateData
    })

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: params.id },
      data: {
        studentId,
        name,
        email,
        yearLevel,
        section,
        course,
        phoneNumber,
        address,
      },
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

    // Delete student record first, then user record
    await prisma.student.delete({
      where: { id: params.id }
    })

    await prisma.user.delete({
      where: { id: student.userId }
    })

    return NextResponse.json({ message: "Student deleted successfully" })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 