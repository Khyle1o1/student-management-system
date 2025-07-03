import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const eventId = searchParams.get('eventId')

    // Calculate skip for pagination
    const skip = (page - 1) * limit

    // Build where clause for search
    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { studentId: { contains: search, mode: 'insensitive' as const } },
        { course: { contains: search, mode: 'insensitive' as const } },
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
      select: {
        id: true,
        studentId: true,
        name: true,
        course: true,
        yearLevel: true,
      },
      orderBy: {
        name: 'asc'
      },
      skip,
      take: limit,
    })

    // If eventId is provided, get attendance records for these students
    let attendanceRecords: {
      id: string;
      studentId: string;
      eventId: string;
      status: any;
      scannedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      notes: string | null;
    }[] = []
    if (eventId) {
      const studentIds = students.map(s => s.id)
      attendanceRecords = await prisma.attendance.findMany({
        where: {
          eventId: eventId,
          studentId: { in: studentIds },
          deletedAt: null,
        },
        select: {
          id: true,
          studentId: true,
          eventId: true,
          status: true,
          scannedAt: true,
          createdAt: true,
          updatedAt: true,
          notes: true,
        }
      })
    }

    // Transform attendance records to match frontend interface
    const transformedAttendance = attendanceRecords.map(record => {
      // Parse time data from notes
      let timeData: { timeIn: string | null, timeOut: string | null } = { timeIn: null, timeOut: null }
      try {
        if (record.notes) {
          timeData = JSON.parse(record.notes)
        }
      } catch (error) {
        // Fallback to scannedAt for timeIn if notes parsing fails
        timeData.timeIn = record.scannedAt ? record.scannedAt.toTimeString().split(' ')[0].substring(0, 5) : null
      }
      
      return {
        id: record.id,
        studentId: record.studentId,
        eventId: record.eventId,
        timeIn: timeData.timeIn,
        timeOut: timeData.timeOut,
        status: record.status.toLowerCase(),
        scannedIn: !!timeData.timeIn,
        scannedOut: !!timeData.timeOut,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({
      students,
      attendanceRecords: transformedAttendance,
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
    console.error("Error fetching students for attendance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 