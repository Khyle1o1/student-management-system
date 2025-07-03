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

    // Students can only access their own attendance records
    if (session.user.role === "STUDENT" && session.user.studentId !== params.studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find the student
    const student = await prisma.student.findUnique({
      where: { 
        studentId: params.studentId,
        deletedAt: null,
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Fetch attendance records with event details
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
          }
        }
      },
      orderBy: {
        event: {
          date: 'desc'
        }
      }
    })

    // Calculate statistics
    const totalEvents = attendanceRecords.length
    const presentCount = attendanceRecords.filter(record => record.status === 'PRESENT').length
    const absentCount = attendanceRecords.filter(record => record.status === 'ABSENT').length
    const lateCount = attendanceRecords.filter(record => record.status === 'LATE').length
    const attendanceRate = totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : 0

    const stats = {
      totalEvents,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate
    }

    // Format the records for the frontend
    const formattedRecords = attendanceRecords.map(record => ({
      id: record.id,
      status: record.status,
      timestamp: record.timestamp,
      notes: record.notes,
      scannedAt: record.scannedAt,
      event: {
        id: record.event.id,
        title: record.event.title,
        description: record.event.description,
        type: record.event.type,
        date: record.event.date,
        startTime: record.event.startTime,
        endTime: record.event.endTime,
        location: record.event.location,
      }
    }))

    return NextResponse.json({
      records: formattedRecords,
      stats
    })
  } catch (error) {
    console.error("Error fetching student attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 