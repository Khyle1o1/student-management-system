import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { logActivity } from "@/lib/activity-logger"

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Fetch fee (including exempted students)
    const { data: fee, error: feeError } = await supabaseAdmin
      .from('fee_structures')
      .select('id, name, type, amount, school_year, semester, scope_type, scope_college, scope_course, exempted_students')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (feeError || !fee) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    // Aggregate paid payments with student details
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        student_id,
        amount,
        status,
        reference,
        payment_method,
        created_at,
        student:students(
          id,
          student_id,
          name,
          email
        )
      `)
      .eq('fee_id', id)
      .eq('status', 'PAID')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (paymentsError) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const uniqueStudentIds = new Set<string>()
    let totalPaid = 0
    for (const p of payments || []) {
      if (p.student_id) uniqueStudentIds.add(p.student_id as unknown as string)
      totalPaid += Number(p.amount || 0)
    }

    const exemptedIds = (fee as any)?.exempted_students as string[] | null | undefined
    const exemptedStudentIds = Array.isArray(exemptedIds) ? exemptedIds.filter(Boolean) : []

    // Fetch exempted student details if any
    let exemptedStudents: { id: string; student_id: string; name: string; email: string | null }[] = []
    if (exemptedStudentIds.length > 0) {
      const { data: exemptedData, error: exemptedError } = await supabaseAdmin
        .from('students')
        .select('id, student_id, name, email')
        .in('id', exemptedStudentIds)

      if (!exemptedError && Array.isArray(exemptedData)) {
        exemptedStudents = exemptedData as any
      }
    }

    // Log activity for transparency: fee report generated
    await logActivity({
      session,
      action: "REPORT_GENERATED",
      module: "reports",
      targetType: "fee_report",
      targetId: (fee as any)?.id,
      targetName: (fee as any)?.name,
      college: (fee as any)?.scope_college || null,
      course: (fee as any)?.scope_course || null,
      details: {
        report: "fee_payments",
        school_year: (fee as any)?.school_year,
        semester: (fee as any)?.semester,
      },
    })

    // Build PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20 // ~0.79 inches
    const currency = (n: number) => `PHP ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

    // Helpers
    const adminName = (session.user as any)?.name || (session.user as any)?.email || 'Administrator'
    const sectionHeader = (title: string, yPos: number) => {
      // Soft background
      doc.setFillColor(245, 247, 250)
      doc.setDrawColor(220, 225, 230)
      doc.rect(margin, yPos - 6, pageWidth - margin * 2, 14, 'FD')
      doc.setTextColor(33, 37, 41)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(title, margin + 4, yPos + 3)
      return yPos + 14
    }

    const checkPageBreak = (requiredHeight: number, currentY: number) => {
      if (currentY + requiredHeight > pageHeight - margin - 12) {
        doc.addPage()
        return margin
      }
      return currentY
    }

    // Header (match event report style - dark blue with white text)
    doc.setFillColor(41, 128, 185)
    doc.rect(0, 0, pageWidth, 40, 'F')
    // // Optional logo area (kept subtle to match event style)
    // doc.setDrawColor(41, 128, 185)
    // doc.setFillColor(255, 255, 255)
    // doc.rect(margin, 10, 16, 16, 'F')
    // Title + subtitle (white)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Fee Report', pageWidth / 2, 16, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(format(new Date(), 'MMMM dd, yyyy HH:mm'), pageWidth / 2, 25, { align: 'center' })

    let y = margin + 30
    // Fee Information section (plain header like event layout)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Fee Information', margin, y)
    y += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const labelX = margin + 6
    const valueX = margin + 46
    const rightX = pageWidth - margin
    const rowGap = 7

    doc.text('Name:', labelX, y)
    doc.text(fee.name, valueX, y)
    y += rowGap
    doc.text('Type:', labelX, y)
    doc.text((fee.type || '').toString(), valueX, y)
    y += rowGap
    doc.text('Amount:', labelX, y)
    // Right-aligned numeric
    doc.text(currency(fee.amount), rightX, y, { align: 'right' })
    y += rowGap
    doc.text('School Year:', labelX, y)
    doc.text(fee.school_year || 'N/A', valueX, y)
    y += rowGap
    if (fee.semester) {
      doc.text('Semester:', labelX, y)
      doc.text(fee.semester, valueX, y)
      y += rowGap
    }

    y += 4
    // Summary section (event-like header band and table)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Summary', margin, y)
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8
    // Table header bar
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
    // Rows
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
    summaryRow('Students Paid', String(uniqueStudentIds.size))
    summaryRow('Total Collected', currency(totalPaid))
    summaryRow('Exempted Students', String(exemptedStudentIds.length))
    y += 6

    // Exempted students section (if any)
    if (exemptedStudents.length > 0) {
      y = checkPageBreak(24, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Exempted Students', margin, y)
      y += 8
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8

      const exTableHeaders = ['Student Name', 'Student ID', 'Email']
      const exTableX = margin
      const exAvailableWidth = pageWidth - margin * 2
      const exBaseWeights = [0.4, 0.2, 0.4]
      const exColWidths = [
        Math.floor(exAvailableWidth * exBaseWeights[0]),
        Math.floor(exAvailableWidth * exBaseWeights[1]),
        0,
      ]
      exColWidths[2] = exAvailableWidth - (exColWidths[0] + exColWidths[1])
      const exTableWidth = exAvailableWidth

      const drawExemptHeader = () => {
        doc.setFillColor(52, 73, 94)
        doc.setDrawColor(52, 73, 94)
        doc.rect(exTableX, y - 6, exTableWidth, 12, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        let x = exTableX + 2
        exTableHeaders.forEach((h, i) => {
          const cellWidth = exColWidths[i]
          const textX = x + 2
          doc.text(h, textX, y + 2)
          x += cellWidth
        })
        y += 12
        doc.setTextColor(0, 0, 0)
      }

      const exRowBaseHeight = 8
      drawExemptHeader()

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      exemptedStudents.forEach((s: any, idx: number) => {
        const rowHeight = exRowBaseHeight
        y = checkPageBreak(rowHeight + 6, y)

        if (idx % 2 === 0) {
          doc.setFillColor(248, 249, 250)
          doc.rect(exTableX, y - 6, exTableWidth, rowHeight, 'F')
        }
        doc.setDrawColor(235, 238, 240)
        doc.rect(exTableX, y - 6, exTableWidth, rowHeight, 'S')

        let x = exTableX + 4
        doc.text(s.name || 'N/A', x, y)
        x += exColWidths[0]
        doc.text(s.student_id || '—', x + 2, y)
        x += exColWidths[1]
        doc.text(s.email || '—', x + 2, y)

        y += rowHeight
        if (y + exRowBaseHeight > pageHeight - margin - 14) {
          doc.addPage()
          y = margin
          drawExemptHeader()
        }
      })

      y += 6
    }

    // Student Payments Table (match event look)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Paid Students', margin, y)
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10
    const tableHeaders = ['Student Name', 'Student ID / Email', 'Date Paid', 'Receipt No.', 'Payment Method']
    const tableX = margin
    const availableTableWidth = pageWidth - margin * 2
    // Slightly compress columns to fit an extra "Payment Method" column
    const baseWeights = [0.36, 0.22, 0.12, 0.15, 0.15]
    const colWidths = [
      Math.floor(availableTableWidth * baseWeights[0]),
      Math.floor(availableTableWidth * baseWeights[1]),
      Math.floor(availableTableWidth * baseWeights[2]),
      Math.floor(availableTableWidth * baseWeights[3]),
      0,
    ]
    colWidths[4] = availableTableWidth - (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3])
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
        const cellX = i === 0 ? x : x
        const cellWidth = colWidths[i]
        const textX = align === 'right' ? cellX + cellWidth - 2 : cellX + 2
        doc.text(h, textX, y + 2, { align: align as any })
        x += cellWidth
      })
      y += 12
      doc.setTextColor(0, 0, 0)
    }

    const rowBaseHeight = 8
    drawTableHeader()

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    ;(payments || []).forEach((p: any, idx: number) => {
      // Compute wrapped lines for first two columns
      const studentRel = Array.isArray(p.student) ? p.student[0] : p.student
      const name = studentRel?.name || 'N/A'
      const idOrEmail = studentRel?.student_id || studentRel?.email || '—'
      const methodRaw: string | null = p.payment_method || null
      const method =
        methodRaw === 'BANK_TRANSFER'
          ? 'Bank Transfer'
          : methodRaw === 'GCASH'
          ? 'GCash'
          : methodRaw === 'ON_SITE'
          ? 'On Site'
          : methodRaw || '—'
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

      const nameLines = wrap(name, colWidths[0])
      const idLines = wrap(idOrEmail, colWidths[1])
      const methodLines = wrap(method, colWidths[4])
      const maxLines = Math.max(1, nameLines.length, idLines.length, methodLines.length)
      const rowHeight = Math.max(rowBaseHeight, maxLines * 4 + 2)

      // Page break if needed
      y = checkPageBreak(rowHeight + 6, y)

      // Zebra rows
      if (idx % 2 === 0) {
        doc.setFillColor(248, 249, 250)
        doc.rect(tableX, y - 6, tableWidth, rowHeight, 'F')
      }
      doc.setDrawColor(235, 238, 240)
      doc.rect(tableX, y - 6, tableWidth, rowHeight, 'S')

      // Draw cells
      let x = tableX + 4
      // Name (wrapped)
      nameLines.forEach((line, i) => {
        doc.text(line, x, y + i * 4)
      })
      x += colWidths[0]
      // ID/Email (wrapped)
      idLines.forEach((line, i) => {
        doc.text(line, x + 2, y + i * 4)
      })
      x += colWidths[1]
      // Date (right, single line)
      doc.text(format(new Date(p.created_at), 'yyyy-MM-dd'), x + colWidths[2] - 4, y, { align: 'right' })
      x += colWidths[2]
      // Receipt (right, single line)
      doc.text(p.reference || '—', x + colWidths[3] - 4, y, { align: 'right' })
      x += colWidths[3]
      // Payment method (wrapped, right-aligned)
      methodLines.forEach((line, i) => {
        doc.text(line, x + colWidths[4] - 4, y + i * 4, { align: 'right' })
      })

      y += rowHeight
      if (y + rowBaseHeight > pageHeight - margin - 14) {
        doc.addPage()
        y = margin
        drawTableHeader()
      }
    })

    // Footer for each page (generated by, date, page x of y)
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

    const fileName = `fee-report-${fee.name.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/fees/[id]/report/pdf:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


