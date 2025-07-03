import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { eventId } = params

    // First verify the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Fetch all attendance records for this event with student information
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        eventId: eventId,
        deletedAt: null,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Since our new system uses custom fields, we'll need to create a custom table
    // For now, let's return the existing attendance records transformed to match our interface
    const transformedRecords = attendanceRecords.map(record => {
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

    return NextResponse.json(transformedRecords)
  } catch (error) {
    console.error("Error fetching attendance records:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { eventId } = params
    const body = await request.json()

    // Verify the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Verify the student exists
    const student = await prisma.student.findUnique({
      where: { id: body.studentId, deletedAt: null },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check if attendance record already exists
    const existingRecord = await prisma.attendance.findUnique({
      where: {
        studentId_eventId: {
          studentId: body.studentId,
          eventId: eventId,
        },
      },
    })

    if (existingRecord) {
      return NextResponse.json({ error: "Attendance record already exists" }, { status: 400 })
    }

    // Create new attendance record with timeIn
    const currentTime = new Date()
    
    // Store timeIn/timeOut data in notes as JSON
    const timeData = {
      timeIn: body.timeIn,
      timeOut: body.timeOut,
    }
    
    const attendanceRecord = await prisma.attendance.create({
      data: {
        studentId: body.studentId,
        eventId: eventId,
        status: body.timeIn ? "PRESENT" : "ABSENT",
        timestamp: currentTime,
        scannedAt: body.scannedIn ? currentTime : null,
        notes: JSON.stringify(timeData),
      },
    })

    return NextResponse.json({
      id: attendanceRecord.id,
      studentId: attendanceRecord.studentId,
      eventId: attendanceRecord.eventId,
      timeIn: body.timeIn,
      timeOut: body.timeOut,
      status: body.status,
      scannedIn: body.scannedIn || false,
      scannedOut: body.scannedOut || false,
      createdAt: attendanceRecord.createdAt.toISOString(),
      updatedAt: attendanceRecord.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating attendance record:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 