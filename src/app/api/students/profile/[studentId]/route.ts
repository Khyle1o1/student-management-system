import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Students can only access their own profile
    if (session.user.role === "STUDENT" && session.user.studentId !== params.studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const student = await prisma.student.findUnique({
      where: { 
        studentId: params.studentId,
        deletedAt: null,
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

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error("Error fetching student profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Students can only update their own profile
    if (session.user.role === "STUDENT" && session.user.studentId !== params.studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, course } = body

    // Find the student first
    const existingStudent = await prisma.student.findUnique({
      where: { 
        studentId: params.studentId,
        deletedAt: null,
      },
      include: {
        user: true
      }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Update student record
    const updatedStudent = await prisma.student.update({
      where: { id: existingStudent.id },
      data: {
        name,
        email,
        course,
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

    // Also update the user record if email changed
    if (email !== existingStudent.user.email) {
      await prisma.user.update({
        where: { id: existingStudent.userId },
        data: {
          email,
          name,
        }
      })
    }

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error("Error updating student profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 