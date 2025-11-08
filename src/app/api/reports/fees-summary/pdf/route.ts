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
    const semester = searchParams.get('semester')
    const schoolYear = searchParams.get('schoolYear')

    // Build fees query with filters
    let feesQuery = supabaseAdmin
      .from('fee_structures')
      .select('id, name, type, amount, school_year, semester, scope_type, scope_college, scope_course')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply role-based filtering based on user's assigned college/course
    if (session.user.role === 'COLLEGE_ORG') {
      const userCollege = session.user.assigned_college
      if (userCollege) {
        // COLLEGE_ORG can see: UNIVERSITY_WIDE fees and fees for their assigned college
        feesQuery = feesQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      } else {
        // If no college assigned, only show UNIVERSITY_WIDE
        feesQuery = feesQuery.eq('scope_type', 'UNIVERSITY_WIDE')
      }
    } else if (session.user.role === 'COURSE_ORG') {
      const userCollege = session.user.assigned_college
      const userCourse = session.user.assigned_course
      if (userCollege && userCourse) {
        // COURSE_ORG can see: UNIVERSITY_WIDE, their college's fees, and their course's fees
        feesQuery = feesQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        // If only college assigned, show UNIVERSITY_WIDE and college fees
        feesQuery = feesQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      } else {
        // If no assignments, only show UNIVERSITY_WIDE
        feesQuery = feesQuery.eq('scope_type', 'UNIVERSITY_WIDE')
      }
    }
    // ADMIN has no restrictions - sees all fees

    // Apply user filters
    if (college) {
      feesQuery = feesQuery.or(`scope_type.eq.UNIVERSITY_WIDE,scope_college.eq.${college}`)
    }
    if (course) {
      feesQuery = feesQuery.eq('scope_course', course)
    }
    if (semester) {
      feesQuery = feesQuery.eq('semester', semester)
    }
    if (schoolYear) {
      feesQuery = feesQuery.eq('school_year', schoolYear)
    }

    const { data: fees, error: feesError } = await feesQuery

    if (feesError) {
      console.error('Error fetching fees:', feesError)
      return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
    }

    // For each fee, get payment statistics
    const feesWithStats = await Promise.all(
      (fees || []).map(async (fee) => {
        // Get all students required to pay based on fee scope
        let studentsQuery = supabaseAdmin
          .from('students')
          .select('id', { count: 'exact', head: false })

        if (fee.scope_type === 'COLLEGE_WIDE' && fee.scope_college) {
          studentsQuery = studentsQuery.eq('college', fee.scope_college)
        } else if (fee.scope_type === 'COURSE_SPECIFIC' && fee.scope_course) {
          studentsQuery = studentsQuery.eq('course', fee.scope_course)
        }

        const { data: requiredStudents, error: studentsError } = await studentsQuery

        if (studentsError) {
          console.error('Error fetching students for fee:', studentsError)
          return {
            ...fee,
            totalStudents: 0,
            studentsPaid: 0,
            totalCollected: 0
          }
        }

        const totalStudents = requiredStudents?.length || 0

        // Get paid payments for this fee
        const { data: payments, error: paymentsError } = await supabaseAdmin
          .from('payments')
          .select('id, student_id, amount, status')
          .eq('fee_id', fee.id)
          .eq('status', 'PAID')
          .is('deleted_at', null)

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError)
          return {
            ...fee,
            totalStudents,
            studentsPaid: 0,
            totalCollected: 0
          }
        }

        // Count unique students who paid
        const uniqueStudentIds = new Set<string>()
        let totalCollected = 0
        for (const payment of payments || []) {
          if (payment.student_id) {
            uniqueStudentIds.add(payment.student_id as unknown as string)
          }
          totalCollected += Number(payment.amount || 0)
        }

        const studentsPaid = uniqueStudentIds.size

        return {
          id: fee.id,
          feeName: fee.name,
          type: fee.type,
          amount: fee.amount,
          schoolYear: fee.school_year,
          semester: fee.semester,
          totalStudents,
          studentsPaid,
          totalCollected: Math.round(totalCollected * 100) / 100
        }
      })
    )

    // Calculate overall statistics
    const totalFees = feesWithStats.length
    const totalMoneyCollected = feesWithStats.reduce((sum, fee) => sum + fee.totalCollected, 0)
    const totalExpectedRevenue = feesWithStats.reduce((sum, fee) => sum + (fee.amount * fee.totalStudents), 0)

    const currency = (n: number) => `PHP ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

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
    doc.text('Fees Summary Report', pageWidth / 2, 16, { align: 'center' })
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
    const summaryWidths = [pageWidth - margin * 2 - 50, 50]
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

    summaryRow('Total Number of Fees', String(totalFees))
    summaryRow('Total Money Collected', currency(totalMoneyCollected))
    summaryRow('Expected Revenue', currency(totalExpectedRevenue))
    y += 8

    // Fees Detail Table
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Fee Details', margin, y)
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    const tableHeaders = ['Fee Name', 'Total', 'Paid', 'Amount', 'Collected']
    const tableX = margin
    const availableTableWidth = pageWidth - margin * 2
    const colWidths = [
      Math.floor(availableTableWidth * 0.35),
      Math.floor(availableTableWidth * 0.12),
      Math.floor(availableTableWidth * 0.12),
      Math.floor(availableTableWidth * 0.20),
      Math.floor(availableTableWidth * 0.21)
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
        const align = i >= 1 ? 'right' : 'left'
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

    feesWithStats.forEach((fee, idx) => {
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

      const nameLines = wrap(fee.feeName, colWidths[0])
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
      // Fee name (wrapped)
      nameLines.forEach((line, i) => {
        doc.text(line, x, y + i * 4)
      })
      x += colWidths[0]
      
      // Total students (right-aligned)
      doc.text(String(fee.totalStudents), x + colWidths[1] - 4, y, { align: 'right' })
      x += colWidths[1]
      
      // Students paid (right-aligned)
      doc.text(String(fee.studentsPaid), x + colWidths[2] - 4, y, { align: 'right' })
      x += colWidths[2]
      
      // Amount (right-aligned)
      doc.text(currency(fee.amount), x + colWidths[3] - 4, y, { align: 'right' })
      x += colWidths[3]
      
      // Total collected (right-aligned)
      doc.text(currency(fee.totalCollected), x + colWidths[4] - 4, y, { align: 'right' })

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

    const fileName = `fees-summary-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/reports/fees-summary/pdf:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

