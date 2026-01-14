import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow ADMIN and organization users to view reports
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Load fee to understand scope + exemptions
    const { data: fee, error: feeError } = await supabaseAdmin
      .from('fee_structures')
      .select('id, name, amount, scope_type, scope_college, scope_course, exempted_students')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (feeError || !fee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 })
    }

    const scopeType = (fee as any)?.scope_type || 'UNIVERSITY_WIDE'
    const scopeCollege = (fee as any)?.scope_college || null
    const scopeCourse = (fee as any)?.scope_course || null
    const exemptedIds = Array.isArray((fee as any)?.exempted_students)
      ? ((fee as any).exempted_students as string[]).filter(Boolean)
      : []

    // Fetch eligible students based on the fee scope (with pagination to avoid 1k cap)
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

      if (scopeType === 'COLLEGE_WIDE' && scopeCollege) {
        studentQuery = studentQuery.eq('college', scopeCollege)
      } else if (scopeType === 'COURSE_SPECIFIC' && scopeCourse) {
        studentQuery = studentQuery.eq('course', scopeCourse)
      }

      const { data: pageStudents, error: studentsError } = await studentQuery

      if (studentsError) {
        console.error('Error fetching eligible students for fee report:', studentsError)
        return NextResponse.json({ error: 'Failed to fetch eligible students' }, { status: 500 })
      }

      if (pageStudents && pageStudents.length > 0) {
        eligibleStudents.push(...pageStudents)
        hasMoreStudents = pageStudents.length === studentPageSize
        studentPage++
      } else {
        hasMoreStudents = false
      }
    }

    const eligibleStudentIds = new Set(eligibleStudents.map((s) => s.id))
    const exemptedSet = new Set(exemptedIds.filter((id) => eligibleStudentIds.has(id)))

    // Pull paid payments (with student context) using pagination
    const paymentsPageSize = 1000
    let paymentsPage = 0
    let hasMorePayments = true

    const paidStudents = new Set<string>()
    const processedPaymentIds = new Set<string>() // Track unique payments
    let totalPaid = 0
    const collectedByCollege = new Map<string, number>()
    const collectedByCourse = new Map<string, number>()

    while (hasMorePayments) {
      const from = paymentsPage * paymentsPageSize
      const to = from + paymentsPageSize - 1

      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from('payments')
        .select(`
          id,
          student_id,
          amount,
          status,
          student:students(id, college, course)
        `)
        .eq('fee_id', id)
        .eq('status', 'PAID')
        .is('deleted_at', null)
        .range(from, to)

      if (paymentsError) {
        console.error('Error fetching payments for report:', paymentsError)
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
      }

      if (payments && payments.length > 0) {
        for (const p of payments) {
          const paymentId = p.id as string
          const studentId = p.student_id as string | null

          // Skip if we've already processed this payment (avoid duplicates)
          if (processedPaymentIds.has(paymentId)) {
            console.warn(`Duplicate payment detected: ${paymentId}`)
            continue
          }

          if (!studentId) continue

          // Only count payments from students within scope
          if (eligibleStudentIds.size > 0 && !eligibleStudentIds.has(studentId)) {
            continue
          }

          // Mark this payment as processed
          processedPaymentIds.add(paymentId)

          const amount = Number(p.amount || 0)
          totalPaid += amount
          paidStudents.add(studentId)

          const collegeKey = (p as any)?.student?.college || 'Unspecified'
          const courseKey = (p as any)?.student?.course || 'Unspecified'

          collectedByCollege.set(collegeKey, (collectedByCollege.get(collegeKey) || 0) + amount)
          const courseMapKey = `${collegeKey}||${courseKey}`
          collectedByCourse.set(courseMapKey, (collectedByCourse.get(courseMapKey) || 0) + amount)
        }

        hasMorePayments = payments.length === paymentsPageSize
        paymentsPage++
      } else {
        hasMorePayments = false
      }
    }

    // Build college and course level statistics
    type CourseAgg = { paidCount: number; unpaidCount: number; exemptedCount: number; totalCollected: number }
    type CollegeAgg = { paidCount: number; unpaidCount: number; exemptedCount: number; totalCollected: number; courses: Map<string, CourseAgg> }

    const collegeMap = new Map<string, CollegeAgg>()
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

    // Count paid / unpaid / exempted per college & course based on eligibility
    for (const student of eligibleStudents) {
      const collegeName = student.college || 'Unspecified'
      const courseName = student.course || 'Unspecified'
      const isPaid = paidStudents.has(student.id)
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

    // Attach collection totals
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

    const summaryPaidCount = Array.from(paidStudents).filter((id) => eligibleStudentIds.has(id)).length
    const summaryExemptedCount = exemptedSet.size
    const totalEligibleStudents = eligibleStudentIds.size

    return NextResponse.json({
      feeId: id,
      scopeType,
      scopeCollege,
      scopeCourse,
      summary: {
        paidStudentCount: summaryPaidCount,
        totalPaid: Math.round(totalPaid * 100) / 100,
        exemptedStudentCount: summaryExemptedCount,
        totalEligibleStudents,
      },
      colleges,
      courses,
    })
  } catch (error) {
    console.error('Error in GET /api/fees/[id]/report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
