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

    // Fetch all students
    const allStudents = await prisma.student.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        studentId: true,
        name: true,
        yearLevel: true,
        course: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Fetch attendance records for this event
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        eventId: eventId,
        deletedAt: null,
      },
      select: {
        id: true,
        studentId: true,
        status: true,
        notes: true,
        scannedAt: true,
        createdAt: true,
      },
    })

    // Create a map of student attendance with parsed time data
    const attendanceMap = new Map<string, any>()
    attendanceRecords.forEach(record => {
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

      attendanceMap.set(record.studentId, {
        ...record,
        timeIn: timeData.timeIn,
        timeOut: timeData.timeOut,
      })
    })

    // Filter students to only include those with both timeIn and timeOut
    const studentsWithCompleteAttendance = allStudents.filter(student => {
      const attendance = attendanceMap.get(student.id)
      return attendance && attendance.timeIn && attendance.timeOut
    })

    // Helper functions
    const formatTime = (time?: string): string => {
      if (!time) return 'Not Recorded'
      try {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      } catch {
        return time
      }
    }

    const calculateDuration = (timeIn?: string, timeOut?: string): string => {
      if (!timeIn || !timeOut) return 'N/A'
      try {
        const start = new Date(`2000-01-01T${timeIn}`)
        const end = new Date(`2000-01-01T${timeOut}`)
        const diffMs = end.getTime() - start.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        return `${diffHours}h ${diffMinutes}m`
      } catch {
        return 'N/A'
      }
    }

    // Format dates
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Create CSV content
    const csvLines: string[] = []
    
    // Title and event info
    csvLines.push(`EVENT ATTENDANCE REPORT`)
    csvLines.push(`Event: ${event.title}`)
    csvLines.push(`Date: ${eventDate}`)
    csvLines.push(`Report generated on: ${reportDate}`)
    csvLines.push(`Total Students with Complete Attendance: ${studentsWithCompleteAttendance.length}`)
    csvLines.push(``) // Empty line
    csvLines.push(`STUDENTS WITH COMPLETE ATTENDANCE:`)
    csvLines.push(``) // Empty line

    // Headers
    csvLines.push(`No.,Student Name,Student ID,Course,Year Level,Time In,Time Out,Duration`)

    if (studentsWithCompleteAttendance.length === 0) {
      csvLines.push(`No students have complete attendance records for this event.`)
    } else {
      // Student data
      studentsWithCompleteAttendance.forEach((student, index) => {
        const attendance = attendanceMap.get(student.id)
        const line = [
          (index + 1).toString(),
          `"${student.name}"`,
          student.studentId,
          student.course,
          student.yearLevel.replace('_', ' '),
          formatTime(attendance.timeIn),
          formatTime(attendance.timeOut),
          calculateDuration(attendance.timeIn, attendance.timeOut)
        ].join(',')
        
        csvLines.push(line)
      })
    }

    const csvContent = csvLines.join('\n')

    // Set headers for CSV download
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="attendance_report_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${event.date.toISOString().split('T')[0]}.csv"`)

    return new NextResponse(csvContent, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error generating attendance report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 