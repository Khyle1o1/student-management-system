import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('search') || ''

    // Calculate skip for pagination
    const skip = (page - 1) * limit

    // Build where clause for search
    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { studentId: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { course: { contains: search, mode: 'insensitive' as const } },
        { college: { contains: search, mode: 'insensitive' as const } },
      ],
      deletedAt: null,
    } : {
      deletedAt: null,
    }

    // Get total count for pagination info
    const totalCount = await prisma.student.count({
      where: whereClause,
    })

    // Get paginated students
    const students = await prisma.student.findMany({
      where: whereClause,
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
      },
      skip,
      take: limit,
    })

    return NextResponse.json({
      students,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrevious: page > 1,
      }
    })
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

    // Create student record without phone number, address, and section
    const student = await prisma.student.create({
      data: {
        studentId,
        userId: user.id,
        name: name || `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
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
          },
        },
      },
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error("Error creating student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 