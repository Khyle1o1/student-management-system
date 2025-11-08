import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
        // Get all students required to pay based on fee scope using pagination
        let allRequiredStudents: any[] = []
        let studentsPage = 0
        const studentsPageSize = 1000
        let hasMoreStudents = true

        while (hasMoreStudents) {
          let studentsQuery = supabaseAdmin
            .from('students')
            .select('id')
            .range(studentsPage * studentsPageSize, (studentsPage + 1) * studentsPageSize - 1)

          if (fee.scope_type === 'COLLEGE_WIDE' && fee.scope_college) {
            studentsQuery = studentsQuery.eq('college', fee.scope_college)
          } else if (fee.scope_type === 'COURSE_SPECIFIC' && fee.scope_course) {
            studentsQuery = studentsQuery.eq('course', fee.scope_course)
          }

          const { data: studentsData, error: studentsError } = await studentsQuery

          if (studentsError) {
            console.error('Error fetching students for fee:', studentsError)
            break
          }

          if (studentsData && studentsData.length > 0) {
            allRequiredStudents = allRequiredStudents.concat(studentsData)
            hasMoreStudents = studentsData.length === studentsPageSize
            studentsPage++
          } else {
            hasMoreStudents = false
          }
        }

        const totalStudents = allRequiredStudents.length

        // Get paid payments for this fee using pagination
        let allPayments: any[] = []
        let paymentsPage = 0
        const paymentsPageSize = 1000
        let hasMorePayments = true

        while (hasMorePayments) {
          const { data: paymentsData, error: paymentsError } = await supabaseAdmin
            .from('payments')
            .select('id, student_id, amount, status')
            .eq('fee_id', fee.id)
            .eq('status', 'PAID')
            .is('deleted_at', null)
            .range(paymentsPage * paymentsPageSize, (paymentsPage + 1) * paymentsPageSize - 1)

          if (paymentsError) {
            console.error('Error fetching payments:', paymentsError)
            break
          }

          if (paymentsData && paymentsData.length > 0) {
            allPayments = allPayments.concat(paymentsData)
            hasMorePayments = paymentsData.length === paymentsPageSize
            paymentsPage++
          } else {
            hasMorePayments = false
          }
        }

        // Count unique students who paid
        const uniqueStudentIds = new Set<string>()
        let totalCollected = 0
        for (const payment of allPayments) {
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
    const collectionRate = totalExpectedRevenue > 0 
      ? Math.round((totalMoneyCollected / totalExpectedRevenue) * 100 * 10) / 10
      : 0

    return NextResponse.json({
      fees: feesWithStats,
      summary: {
        totalFees,
        totalMoneyCollected: Math.round(totalMoneyCollected * 100) / 100,
        totalExpectedRevenue: Math.round(totalExpectedRevenue * 100) / 100,
        collectionRate
      }
    })
  } catch (error) {
    console.error('Error in GET /api/reports/fees-summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

