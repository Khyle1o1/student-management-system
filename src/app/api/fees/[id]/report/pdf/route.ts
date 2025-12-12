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

    const exemptedIds = (fee as any)?.exempted_students as string[] | null | undefined
    const exemptedStudentIds = Array.isArray(exemptedIds) ? exemptedIds.filter(Boolean) : []

    // Fetch eligible students based on scope (with pagination to bypass 1k cap)
    const eligibleStudents: { id: string; college: string | null; course: string | null }[] = []
    const studentPageSize = 1000
    let studentPage = 0
    let hasMoreStudents = true

    while (hasMoreStudents) {
      const from = studentPage * studentPageSize
      const to = from + studentPageSize - 1

      let studentQuery = supabaseAdmin
        .from('students')
        .select('id, college, course')
        .or('archived.is.null,archived.eq.false')
        .range(from, to)

      if (fee.scope_type === 'COLLEGE_WIDE' && fee.scope_college) {
        studentQuery = studentQuery.eq('college', fee.scope_college)
      } else if (fee.scope_type === 'COURSE_SPECIFIC' && fee.scope_course) {
        studentQuery = studentQuery.eq('course', fee.scope_course)
      }

      const { data: studentsData, error: studentsError } = await studentQuery
      if (studentsError) {
        console.error('Error fetching eligible students for PDF:', studentsError)
        return NextResponse.json({ error: 'Failed to fetch eligible students' }, { status: 500 })
      }

      if (studentsData && studentsData.length > 0) {
        eligibleStudents.push(...studentsData)
        hasMoreStudents = studentsData.length === studentPageSize
        studentPage++
      } else {
        hasMoreStudents = false
      }
    }

    const eligibleStudentIds = new Set(eligibleStudents.map((s) => s.id))
    const exemptedSet = new Set(exemptedStudentIds.filter((id) => eligibleStudentIds.has(id)))

    // Aggregate paid payments with student details (paginated)
    const paymentsPageSize = 1000
    let paymentsPage = 0
    let hasMorePayments = true
    const payments: any[] = []
    const uniqueStudentIds = new Set<string>()
    let totalPaid = 0

    while (hasMorePayments) {
      const from = paymentsPage * paymentsPageSize
      const to = from + paymentsPageSize - 1

      const { data: paymentsData, error: paymentsError } = await supabaseAdmin
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
            email,
            college,
            course
          )
        `)
        .eq('fee_id', id)
        .eq('status', 'PAID')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(from, to)

      if (paymentsError) {
        console.error('Error fetching payments for PDF report:', paymentsError)
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
      }

      if (paymentsData && paymentsData.length > 0) {
        for (const p of paymentsData) {
          const studentId = p.student_id as string | null
          if (!studentId) continue
          if (eligibleStudentIds.size > 0 && !eligibleStudentIds.has(studentId)) continue
          payments.push(p)
          uniqueStudentIds.add(studentId)
          totalPaid += Number(p.amount || 0)
        }
        hasMorePayments = paymentsData.length === paymentsPageSize
        paymentsPage++
      } else {
        hasMorePayments = false
      }
    }

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

    // Build statistics by college / course
    type CourseAgg = { paidCount: number; unpaidCount: number; exemptedCount: number; totalCollected: number }
    type CollegeAgg = { paidCount: number; unpaidCount: number; exemptedCount: number; totalCollected: number; courses: Map<string, CourseAgg> }

    const collegeMap = new Map<string, CollegeAgg>()
    const collectedByCollege = new Map<string, number>()
    const collectedByCourse = new Map<string, number>()

    const ensureCollege = (collegeName: string) => {
      if (!collegeMap.has(collegeName)) {
        collegeMap.set(collegeName, {
          paidCount: 0,
          unpaidCount: 0,
          exemptedCount: 0,
          totalCollected: 0,
          courses: new Map(),
        })
      }
      return collegeMap.get(collegeName)!
    }

    const ensureCourse = (collegeName: string, courseName: string) => {
      const college = ensureCollege(collegeName)
      if (!college.courses.has(courseName)) {
        college.courses.set(courseName, {
          paidCount: 0,
          unpaidCount: 0,
          exemptedCount: 0,
          totalCollected: 0,
        })
      }
      return college.courses.get(courseName)!
    }

    // Aggregate payments by college / course
    for (const p of payments) {
      const collegeKey = (p as any)?.student?.college || 'Unspecified'
      const courseKey = (p as any)?.student?.course || 'Unspecified'
      const amount = Number(p.amount || 0)
      collectedByCollege.set(collegeKey, (collectedByCollege.get(collegeKey) || 0) + amount)
      const courseMapKey = `${collegeKey}||${courseKey}`
      collectedByCourse.set(courseMapKey, (collectedByCourse.get(courseMapKey) || 0) + amount)
    }

    // Count paid / unpaid / exempted
    for (const student of eligibleStudents) {
      const collegeName = student.college || 'Unspecified'
      const courseName = student.course || 'Unspecified'
      const isPaid = uniqueStudentIds.has(student.id)
      const isExempted = exemptedSet.has(student.id)

      const college = ensureCollege(collegeName)
      const course = ensureCourse(collegeName, courseName)

      if (isExempted) {
        college.exemptedCount += 1
        course.exemptedCount += 1
      } else if (isPaid) {
        college.paidCount += 1
        course.paidCount += 1
      } else {
        college.unpaidCount += 1
        course.unpaidCount += 1
      }
    }

    for (const [collegeName, amount] of collectedByCollege.entries()) {
      const college = ensureCollege(collegeName)
      college.totalCollected += Math.round(amount * 100) / 100
    }

    for (const [courseKey, amount] of collectedByCourse.entries()) {
      const [collegeName, courseName] = courseKey.split('||')
      const course = ensureCourse(collegeName, courseName)
      course.totalCollected += Math.round(amount * 100) / 100
    }

    const colleges = Array.from(collegeMap.entries())
      .map(([name, data]) => ({
        name,
        paidCount: data.paidCount,
        unpaidCount: data.unpaidCount,
        exemptedCount: data.exemptedCount,
        totalCollected: Math.round(data.totalCollected * 100) / 100,
        courses: Array.from(data.courses.entries())
          .map(([courseName, courseData]) => ({
            name: courseName,
            paidCount: courseData.paidCount,
            unpaidCount: courseData.unpaidCount,
            exemptedCount: courseData.exemptedCount,
            totalCollected: Math.round(courseData.totalCollected * 100) / 100,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const courses = colleges.flatMap((college) =>
      college.courses.map((course) => ({
        ...course,
        college: college.name,
      }))
    )

    const summaryPaidCount = Array.from(uniqueStudentIds).filter((id) => eligibleStudentIds.has(id)).length
    const summaryExemptedCount = exemptedSet.size
    const totalEligibleStudents = eligibleStudentIds.size
    const summaryUnpaid = Math.max(totalEligibleStudents - summaryPaidCount - summaryExemptedCount, 0)

    // Build PDF (use landscape for wider fee reports)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })                                                   
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20 // ~0.79 inches
    const currency = (n: number) => `PHP ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

    // Helpers
    const adminName = (session.user as any)?.name || (session.user as any)?.email || 'Administrator'
    const generatedAt = format(new Date(), 'MMM dd, yyyy HH:mm')
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
    summaryRow('Students Paid', String(summaryPaidCount))
    summaryRow('Total Collected', currency(totalPaid))
    summaryRow('Exempted Students', String(summaryExemptedCount))
    summaryRow('Total Eligible (scope)', String(totalEligibleStudents))
    summaryRow('Not Yet Paid', String(summaryUnpaid))
    y += 6

    const renderCourseTable = (title: string, rows: { name: string; college?: string; paidCount: number; unpaidCount: number; exemptedCount: number; totalCollected: number }[]) => {
      if (!rows || rows.length === 0) return y
      y = checkPageBreak(22, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(title, margin, y)
      y += 6
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      const tableX = margin
      const availableWidth = pageWidth - margin * 2
      const colWeights = [0.42, 0.16, 0.16, 0.12, 0.14] // Course, Paid, Not paid, Ex, Collected
      const colWidths = colWeights.map(w => Math.floor(availableWidth * w))
      colWidths[4] = availableWidth - (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3])

      const drawHeader = () => {
        doc.setFillColor(52, 73, 94)
        doc.setDrawColor(52, 73, 94)
        doc.rect(tableX, y - 6, availableWidth, 12, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        const headers = ['Course', 'Paid', 'Not paid', 'Exempted', 'Collected']
        let x = tableX + 2
        headers.forEach((h, i) => {
          const align = i === 0 ? 'left' : 'right'
          const cellWidth = colWidths[i]
          const textX = align === 'right' ? x + cellWidth - 2 : x + 2
          doc.text(h, textX, y + 2, { align: align as any })
          x += cellWidth
        })
        y += 12
        doc.setTextColor(0, 0, 0)
      }

      drawHeader()
      const rowBaseHeight = 8

      rows.forEach((course, idx) => {
        const rowHeight = rowBaseHeight
        y = checkPageBreak(rowHeight + 6, y)
        if (idx % 2 === 0) {
          doc.setFillColor(248, 249, 250)
          doc.rect(tableX, y - 6, availableWidth, rowHeight, 'F')
        }
        doc.setDrawColor(235, 238, 240)
        doc.rect(tableX, y - 6, availableWidth, rowHeight, 'S')

        let x = tableX + 4
        doc.text(course.name, x, y)
        x += colWidths[0]
        doc.text(String(course.paidCount), x + colWidths[1] - 4, y, { align: 'right' })
        x += colWidths[1]
        doc.text(String(course.unpaidCount), x + colWidths[2] - 4, y, { align: 'right' })
        x += colWidths[2]
        doc.text(String(course.exemptedCount), x + colWidths[3] - 4, y, { align: 'right' })
        x += colWidths[3]
        doc.text(currency(course.totalCollected || 0), x + colWidths[4] - 4, y, { align: 'right' })

        y += rowHeight
        if (y + rowBaseHeight > pageHeight - margin - 14) {
          doc.addPage()
          y = margin
          drawHeader()
        }
      })

      y += 6
      return y
    }

    const renderCollegeBlocks = (rows: { name: string; paidCount: number; unpaidCount: number; exemptedCount: number; totalCollected: number; courses: any[] }[]) => {
      if (!rows || rows.length === 0) return y
      y = checkPageBreak(18, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('College Statistics', margin, y)
      y += 8
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8

      rows.forEach((college, idx) => {
        y = checkPageBreak(22, y)
        if (idx % 2 === 0) {
          doc.setFillColor(248, 249, 250)
          doc.rect(margin, y - 6, pageWidth - margin * 2, 22, 'F')
        }
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(college.name, margin + 2, y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(`Collected: ${currency(college.totalCollected || 0)}`, pageWidth - margin - 2, y, { align: 'right' })
        y += 6
        doc.setFontSize(9.5)
        doc.text(`Paid: ${college.paidCount}`, margin + 4, y)
        doc.text(`Not paid: ${college.unpaidCount}`, margin + 44, y)
        doc.text(`Exempted: ${college.exemptedCount}`, margin + 96, y)
        y += 10

        if (college.courses && college.courses.length > 0) {
          const tableStartY = y
          y = renderCourseTable(`Course Statistics - ${college.name}`, college.courses.map(c => ({ ...c, college: college.name })))
          if (y - tableStartY < 6) {
            y += 6
          }
        }
      })
    }

    // Scope-aware rendering
    const isUniversity = fee.scope_type === 'UNIVERSITY_WIDE'
    const isCollegeWide = fee.scope_type === 'COLLEGE_WIDE'
    const isCourseOnly = fee.scope_type === 'COURSE_SPECIFIC'

    // College / Course statistics (scope-aware)
    if (isUniversity) {
      renderCollegeBlocks(colleges)
    } else if (isCollegeWide) {
      const target = colleges.filter((c) => !fee.scope_college || c.name === fee.scope_college)
      renderCollegeBlocks(target)
    } else if (isCourseOnly) {
      const targetCourses = courses.filter((c) => !fee.scope_course || c.name === fee.scope_course)
      renderCourseTable(`Course Statistics${fee.scope_course ? ` - ${fee.scope_course}` : ''}`, targetCourses)
    }

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
    // Compress Student ID and Date Paid to give more width to Receipt No.
    // [Student Name, Student ID/Email, Date Paid, Receipt No., Payment Method]
    const baseWeights = [0.33, 0.17, 0.07, 0.28, 0.15]
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
      // Compute wrapped lines for text-heavy columns
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
      const receiptText = p.reference || '—'
      const receiptLines = wrap(receiptText, colWidths[3])
      const methodLines = wrap(method, colWidths[4])
      const maxLines = Math.max(1, nameLines.length, idLines.length, receiptLines.length, methodLines.length)
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
      // Receipt (wrapped, right-aligned so long refs are fully visible)
      receiptLines.forEach((line, i) => {
        doc.text(line, x + colWidths[3] - 4, y + i * 4, { align: 'right' })
      })
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

    // Footer for each page (standardized footer format)
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const footerY = pageHeight - 10
      doc.setDrawColor(220, 225, 230)
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      // Standardized footer with timestamp
      const footerText = `By: Smart-U · Developed by Khyle Amacna of AOG Tech · Generated by: ${adminName}`
      doc.text(footerText, pageWidth / 2, footerY, { align: 'center' })
      doc.setFontSize(7)
      doc.text(`Generated on: ${generatedAt}`, pageWidth / 2, footerY + 5, { align: 'center' })
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY + 9, { align: 'center' })
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


