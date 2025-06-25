import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Check if student ID already exists
    const existingStudent = await prisma.student.findUnique({
      where: { studentId }
    })

    if (existingStudent) {
      return NextResponse.json({ error: "Student ID already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user first
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "STUDENT",
        name,
      }
    })

    // Create student record
    const student = await prisma.student.create({
      data: {
        studentId,
        userId: user.id,
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

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error("Error creating student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 