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

    // Fetch event details
    const event = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Fetch all attendance records for this event
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        eventId: eventId,
        deletedAt: null,
      },
      include: {
        student: {
          select: {
            studentId: true,
            name: true,
            yearLevel: true,
            section: true,
            course: true,
          },
        },
      },
      orderBy: {
        student: {
          name: 'asc',
        },
      },
    })

    // Create CSV content
    const headers = [
      'Student ID',
      'Student Name',
      'Course',
      'Year Level',
      'Section',
      'Status',
      'Time In',
      'Scan Method',
      'Date Recorded',
    ]

    const csvRows = [
      headers.join(','),
      ...attendanceRecords.map(record => [
        record.student.studentId,
        `"${record.student.name}"`,
        record.student.course,
        record.student.yearLevel.replace('_', ' '),
        record.student.section,
        record.status,
        record.scannedAt ? record.scannedAt.toTimeString().split(' ')[0].substring(0, 5) : 'Not Recorded',
        record.scannedAt ? 'Scanned' : 'Manual',
        record.createdAt.toISOString().split('T')[0],
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')

    // Set headers for file download
    const headers_response = new Headers()
    headers_response.set('Content-Type', 'text/csv')
    headers_response.set('Content-Disposition', `attachment; filename="attendance-${event.title.replace(/[^a-zA-Z0-9]/g, '_')}-${event.date.toISOString().split('T')[0]}.csv"`)

    return new NextResponse(csvContent, {
      status: 200,
      headers: headers_response,
    })
  } catch (error) {
    console.error("Error exporting attendance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 