import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url)
    const college = searchParams.get('college')
    const course = searchParams.get('course')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build events query with filters
    let eventsQuery = supabaseAdmin
      .from('events')
      .select('id, title, date, scope_type, scope_college, scope_course')
      .order('date', { ascending: false })

    // Apply role-based filtering based on user's assigned college/course
    if (session.user.role === 'COLLEGE_ORG') {
      const userCollege = session.user.assigned_college
      if (userCollege) {
        // COLLEGE_ORG can see: UNIVERSITY_WIDE events and events for their assigned college
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      } else {
        // If no college assigned, only show UNIVERSITY_WIDE
        eventsQuery = eventsQuery.eq('scope_type', 'UNIVERSITY_WIDE')
      }
    } else if (session.user.role === 'COURSE_ORG') {
      const userCollege = session.user.assigned_college
      const userCourse = session.user.assigned_course
      if (userCollege && userCourse) {
        // COURSE_ORG can see: UNIVERSITY_WIDE, their college's events, and their course's events
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        // If only college assigned, show UNIVERSITY_WIDE and college events
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      } else {
        // If no assignments, only show UNIVERSITY_WIDE
        eventsQuery = eventsQuery.eq('scope_type', 'UNIVERSITY_WIDE')
      }
    }
    // ADMIN has no restrictions - sees all events

    // Apply user filters
    if (college) {
      eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,scope_college.eq.${college}`)
    }
    if (course) {
      eventsQuery = eventsQuery.eq('scope_course', course)
    }
    if (dateFrom) {
      eventsQuery = eventsQuery.gte('date', dateFrom)
    }
    if (dateTo) {
      eventsQuery = eventsQuery.lte('date', dateTo)
    }

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // For each event, get attendance statistics
    const eventsWithStats = await Promise.all(
      (events || []).map(async (event) => {
        // Get all students eligible for this event based on scope using pagination
        let allEligibleStudents: any[] = []
        let studentsPage = 0
        const studentsPageSize = 1000
        let hasMoreStudents = true

        while (hasMoreStudents) {
          let studentsQuery = supabaseAdmin
            .from('students')
            .select('id')
            .range(studentsPage * studentsPageSize, (studentsPage + 1) * studentsPageSize - 1)

          if (event.scope_type === 'COLLEGE_WIDE' && event.scope_college) {
            studentsQuery = studentsQuery.eq('college', event.scope_college)
          } else if (event.scope_type === 'COURSE_SPECIFIC' && event.scope_course) {
            studentsQuery = studentsQuery.eq('course', event.scope_course)
          }

          const { data: studentsData, error: studentsError } = await studentsQuery

          if (studentsError) {
            console.error('Error fetching students for event:', studentsError)
            break
          }

          if (studentsData && studentsData.length > 0) {
            allEligibleStudents = allEligibleStudents.concat(studentsData)
            hasMoreStudents = studentsData.length === studentsPageSize
            studentsPage++
          } else {
            hasMoreStudents = false
          }
        }

        const totalStudents = allEligibleStudents.length

        // Get attendance records for this event using pagination
        let allAttendance: any[] = []
        let attendancePage = 0
        const attendancePageSize = 1000
        let hasMoreAttendance = true

        while (hasMoreAttendance) {
          const { data: attendanceData, error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .select('id, student_id, status')
            .eq('event_id', event.id)
            .in('status', ['PRESENT', 'LATE'])
            .range(attendancePage * attendancePageSize, (attendancePage + 1) * attendancePageSize - 1)

          if (attendanceError) {
            console.error('Error fetching attendance:', attendanceError)
            break
          }

          if (attendanceData && attendanceData.length > 0) {
            allAttendance = allAttendance.concat(attendanceData)
            hasMoreAttendance = attendanceData.length === attendancePageSize
            attendancePage++
          } else {
            hasMoreAttendance = false
          }
        }

        const studentsAttended = allAttendance.length
        const attendanceRate = totalStudents > 0 ? (studentsAttended / totalStudents) * 100 : 0

        return {
          id: event.id,
          eventName: event.title,
          date: event.date,
          totalStudents,
          studentsAttended,
          attendanceRate: Math.round(attendanceRate * 10) / 10
        }
      })
    )

    // Calculate overall statistics
    const totalEvents = eventsWithStats.length
    const totalAttendanceRecords = eventsWithStats.reduce((sum, event) => sum + event.studentsAttended, 0)
    const totalPossibleAttendance = eventsWithStats.reduce((sum, event) => sum + event.totalStudents, 0)
    const overallAttendanceRate = totalPossibleAttendance > 0 
      ? Math.round((totalAttendanceRecords / totalPossibleAttendance) * 100 * 10) / 10
      : 0

    // Build PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20

    // Helpers
    const adminName = (session.user as any)?.name || (session.user as any)?.email || 'Administrator'
    
    const checkPageBreak = (requiredHeight: number, currentY: number) => {
      if (currentY + requiredHeight > pageHeight - margin - 12) {
        doc.addPage()
        return margin
      }
      return currentY
    }

    // Header (dark blue with white text)
    doc.setFillColor(41, 128, 185)
    doc.rect(0, 0, pageWidth, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Event Summary Report', pageWidth / 2, 16, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(format(new Date(), 'MMMM dd, yyyy HH:mm'), pageWidth / 2, 25, { align: 'center' })

    let y = margin + 30

    // Overall Summary Section
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Overall Summary', margin, y)
    y += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    // Summary table
    const summaryX = margin
    const summaryWidths = [pageWidth - margin * 2 - 40, 40]
    doc.setFillColor(52, 73, 94)
    doc.rect(summaryX, y - 6, summaryWidths[0] + summaryWidths[1], 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Metric', summaryX + 3, y + 1)
    doc.text('Value', summaryX + summaryWidths[0] + summaryWidths[1] - 3, y + 1, { align: 'right' })
    y += 10

    const summaryRow = (label: string, value: string) => {
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setDrawColor(235, 238, 240)
      doc.rect(summaryX, y - 6, summaryWidths[0] + summaryWidths[1], 9, 'S')
      doc.text(label, summaryX + 3, y)
      doc.text(value, summaryX + summaryWidths[0] + summaryWidths[1] - 3, y, { align: 'right' })
      y += 9
    }

    summaryRow('Total Events', String(totalEvents))
    summaryRow('Total Attendance Records', String(totalAttendanceRecords))
    summaryRow('Overall Attendance Rate', `${overallAttendanceRate}%`)
    y += 8

    // Events Detail Table
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Event Details', margin, y)
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    const tableHeaders = ['Event Name', 'Date', 'Total', 'Attended', 'Rate %']
    const tableX = margin
    const availableTableWidth = pageWidth - margin * 2
    const colWidths = [
      Math.floor(availableTableWidth * 0.40),
      Math.floor(availableTableWidth * 0.20),
      Math.floor(availableTableWidth * 0.13),
      Math.floor(availableTableWidth * 0.13),
      Math.floor(availableTableWidth * 0.14)
    ]
    const tableWidth = availableTableWidth

    const drawTableHeader = () => {
      doc.setFillColor(52, 73, 94)
      doc.setDrawColor(52, 73, 94)
      doc.rect(tableX, y - 6, tableWidth, 12, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      let x = tableX + 2
      tableHeaders.forEach((h, i) => {
        const align = i >= 2 ? 'right' : 'left'
        const cellWidth = colWidths[i]
        const textX = align === 'right' ? x + cellWidth - 2 : x + 2
        doc.text(h, textX, y + 2, { align: align as any })
        x += cellWidth
      })
      y += 12
      doc.setTextColor(0, 0, 0)
    }

    drawTableHeader()

    const rowBaseHeight = 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    eventsWithStats.forEach((event, idx) => {
      const wrap = (text: string, width: number) => {
        const words = String(text).split(' ')
        const lines: string[] = []
        let current = ''
        words.forEach(word => {
          const testLine = current ? `${current} ${word}` : word
          if (doc.getTextWidth(testLine) < width - 6) {
            current = testLine
          } else {
            if (current) lines.push(current)
            current = word
          }
        })
        if (current) lines.push(current)
        return lines
      }

      const nameLines = wrap(event.eventName, colWidths[0])
      const maxLines = Math.max(1, nameLines.length)
      const rowHeight = Math.max(rowBaseHeight, maxLines * 4 + 2)

      // Page break if needed
      y = checkPageBreak(rowHeight + 6, y)
      if (y === margin) {
        drawTableHeader()
      }

      // Zebra rows
      if (idx % 2 === 0) {
        doc.setFillColor(248, 249, 250)
        doc.rect(tableX, y - 6, tableWidth, rowHeight, 'F')
      }
      doc.setDrawColor(235, 238, 240)
      doc.rect(tableX, y - 6, tableWidth, rowHeight, 'S')

      // Draw cells
      let x = tableX + 4
      // Event name (wrapped)
      nameLines.forEach((line, i) => {
        doc.text(line, x, y + i * 4)
      })
      x += colWidths[0]
      
      // Date
      doc.text(format(new Date(event.date), 'MMM dd, yyyy'), x + 2, y)
      x += colWidths[1]
      
      // Total students (right-aligned)
      doc.text(String(event.totalStudents), x + colWidths[2] - 4, y, { align: 'right' })
      x += colWidths[2]
      
      // Students attended (right-aligned)
      doc.text(String(event.studentsAttended), x + colWidths[3] - 4, y, { align: 'right' })
      x += colWidths[3]
      
      // Attendance rate (right-aligned)
      doc.text(`${event.attendanceRate}%`, x + colWidths[4] - 4, y, { align: 'right' })

      y += rowHeight
    })

    // Footer for each page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const footerY = pageHeight - 10
      doc.setDrawColor(220, 225, 230)
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated by: ${adminName}`, margin, footerY)
      doc.text(format(new Date(), 'MMM dd, yyyy HH:mm'), pageWidth - margin, footerY, { align: 'right' })
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY, { align: 'center' })
    }

    const pdfBytes = doc.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfBytes)

    const fileName = `event-summary-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/events-summary/pdf:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

