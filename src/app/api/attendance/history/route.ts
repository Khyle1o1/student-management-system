import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch all attendance records with student and event information
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            yearLevel: true,
            course: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            type: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform the data to match frontend expectations
    const transformedRecords = attendanceRecords.map(record => ({
      id: record.id,
      studentId: record.studentId,
      studentName: record.student.name,
      studentNumber: record.student.studentId,
      course: record.student.course,
      yearLevel: record.student.yearLevel.replace('_', ' ').toLowerCase(),
      section: null,
      eventId: record.eventId,
      eventTitle: record.event.title,
      eventDate: record.event.date.toISOString().split('T')[0],
      timeIn: record.scannedAt ? record.scannedAt.toTimeString().split(' ')[0].substring(0, 5) : undefined,
      timeOut: undefined, // We'll need to extend the schema for this
      status: record.status.toLowerCase(),
      scannedIn: !!record.scannedAt,
      scannedOut: false, // We'll need to extend the schema for this
      createdAt: record.createdAt.toISOString(),
    }))

    return NextResponse.json(transformedRecords)
  } catch (error) {
    console.error("Error fetching attendance history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 