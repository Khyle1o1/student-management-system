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
        createdAt: 'desc'
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
      studentId,
      yearLevel,
      section,
      course,
      college,
      firstName,
      lastName,
      middleName
    } = body

    // Check if user with email already exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        email
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Check if student ID already exists
    const existingStudent = await prisma.student.findFirst({
      where: { 
        studentId
      }
    })

    if (existingStudent) {
      return NextResponse.json({ error: "Student ID already exists" }, { status: 400 })
    }

    // For OAuth students, create empty password (they'll login via Google)
    const hashedPassword = await bcrypt.hash("", 12) // Empty password for OAuth-only users

    // Create user first
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "STUDENT",
        name: name || `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
      }
    })

    // Create student record without phone number and address
    const student = await prisma.student.create({
      data: {
        studentId,
        userId: user.id,
        name: name || `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
        email,
        yearLevel,
        section,
        course,
        // Removed phoneNumber and address fields
        // These fields remain nullable in the database but are not used
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