import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow all administrative roles to access reports overview
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get user's assigned college and course for filtering
    const userCollege = session.user.assigned_college
    const userCourse = session.user.assigned_course
    const userRole = session.user.role

    // Calculate date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // 1. TOTAL STUDENTS with growth
    let studentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })

    if (userRole === 'COLLEGE_ORG' && userCollege) {
      studentsQuery = studentsQuery.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      studentsQuery = studentsQuery.eq('course', userCourse)
    }

    const { count: totalStudents } = await studentsQuery

    // Students added this month
    let newStudentsThisMonth = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    if (userRole === 'COLLEGE_ORG' && userCollege) {
      newStudentsThisMonth = newStudentsThisMonth.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      newStudentsThisMonth = newStudentsThisMonth.eq('course', userCourse)
    }

    const { count: newStudents } = await newStudentsThisMonth

    // Students added last month
    let newStudentsLastMonth = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString())

    if (userRole === 'COLLEGE_ORG' && userCollege) {
      newStudentsLastMonth = newStudentsLastMonth.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      newStudentsLastMonth = newStudentsLastMonth.eq('course', userCourse)
    }

    const { count: lastMonthNewStudents } = await newStudentsLastMonth

    const studentGrowthPercent = lastMonthNewStudents && lastMonthNewStudents > 0
      ? Math.round(((newStudents || 0) - lastMonthNewStudents) / lastMonthNewStudents * 100)
      : (newStudents || 0) > 0 ? 100 : 0

    // 2. ACTIVE EVENTS (upcoming and ongoing)
    let eventsQuery = supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', now.toISOString().split('T')[0])

    // Apply role-based filtering for events
    if (userRole === 'COLLEGE_ORG' && userCollege) {
      eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
    } else if (userRole === 'COURSE_ORG') {
      if (userCollege && userCourse) {
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      }
    }

    const { count: activeEvents } = await eventsQuery

    // Events added this month
    let eventsThisMonthQuery = supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    if (userRole === 'COLLEGE_ORG' && userCollege) {
      eventsThisMonthQuery = eventsThisMonthQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
    } else if (userRole === 'COURSE_ORG') {
      if (userCollege && userCourse) {
        eventsThisMonthQuery = eventsThisMonthQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        eventsThisMonthQuery = eventsThisMonthQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      }
    }

    const { count: eventsThisMonth } = await eventsThisMonthQuery

    // 3. ATTENDANCE RATE (overall)
    // Get all past events
    let pastEventsQuery = supabaseAdmin
      .from('events')
      .select('id, scope_type, scope_college, scope_course')
      .lt('date', now.toISOString().split('T')[0])

    if (userRole === 'COLLEGE_ORG' && userCollege) {
      pastEventsQuery = pastEventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
    } else if (userRole === 'COURSE_ORG') {
      if (userCollege && userCourse) {
        pastEventsQuery = pastEventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        pastEventsQuery = pastEventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      }
    }

    const { data: pastEvents } = await pastEventsQuery

    let totalExpectedAttendance = 0
    let totalActualAttendance = 0

    // Calculate attendance for each event (limited to recent 20 events for performance)
    const recentEvents = (pastEvents || []).slice(-20)
    
    for (const event of recentEvents) {
      // Get eligible students count
      let studentsCountQuery = supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })

      if (event.scope_type === 'COLLEGE_WIDE' && event.scope_college) {
        studentsCountQuery = studentsCountQuery.eq('college', event.scope_college)
      } else if (event.scope_type === 'COURSE_SPECIFIC' && event.scope_course) {
        studentsCountQuery = studentsCountQuery.eq('course', event.scope_course)
      }

      const { count: eligibleStudents } = await studentsCountQuery
      totalExpectedAttendance += eligibleStudents || 0

      // Get attendance count (limit to 1000 for performance)
      const { count: attendanceCount } = await supabaseAdmin
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .in('status', ['PRESENT', 'LATE'])
        .limit(1000)

      totalActualAttendance += attendanceCount || 0
    }

    const attendanceRate = totalExpectedAttendance > 0
      ? Math.round((totalActualAttendance / totalExpectedAttendance) * 100 * 10) / 10
      : 0

    // Attendance rate last month (for comparison)
    const lastMonthStart = startOfLastMonth
    const lastMonthEnd = endOfLastMonth

    let lastMonthEventsQuery = supabaseAdmin
      .from('events')
      .select('id, scope_type, scope_college, scope_course')
      .gte('date', lastMonthStart.toISOString().split('T')[0])
      .lte('date', lastMonthEnd.toISOString().split('T')[0])

    if (userRole === 'COLLEGE_ORG' && userCollege) {
      lastMonthEventsQuery = lastMonthEventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
    } else if (userRole === 'COURSE_ORG') {
      if (userCollege && userCourse) {
        lastMonthEventsQuery = lastMonthEventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        lastMonthEventsQuery = lastMonthEventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      }
    }

    const { data: lastMonthEvents } = await lastMonthEventsQuery

    let lastMonthExpected = 0
    let lastMonthActual = 0

    for (const event of (lastMonthEvents || []).slice(-10)) {
      let studentsCountQuery = supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })

      if (event.scope_type === 'COLLEGE_WIDE' && event.scope_college) {
        studentsCountQuery = studentsCountQuery.eq('college', event.scope_college)
      } else if (event.scope_type === 'COURSE_SPECIFIC' && event.scope_course) {
        studentsCountQuery = studentsCountQuery.eq('course', event.scope_course)
      }

      const { count: eligibleStudents } = await studentsCountQuery
      lastMonthExpected += eligibleStudents || 0

      const { count: attendanceCount } = await supabaseAdmin
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .in('status', ['PRESENT', 'LATE'])
        .limit(1000)

      lastMonthActual += attendanceCount || 0
    }

    const lastMonthAttendanceRate = lastMonthExpected > 0
      ? Math.round((lastMonthActual / lastMonthExpected) * 100 * 10) / 10
      : 0

    const attendanceRateChange = attendanceRate - lastMonthAttendanceRate

    // 4. MONTHLY REVENUE (this month's payments)
    let paymentsThisMonthQuery = supabaseAdmin
      .from('payments')
      .select('amount, status')
      .eq('status', 'PAID')
      .is('deleted_at', null)
      .gte('created_at', startOfMonth.toISOString())

    const { data: paymentsThisMonth } = await paymentsThisMonthQuery

    const monthlyRevenue = (paymentsThisMonth || []).reduce((sum, payment) => {
      return sum + Number(payment.amount || 0)
    }, 0)

    // Revenue last month (for comparison)
    let paymentsLastMonthQuery = supabaseAdmin
      .from('payments')
      .select('amount, status')
      .eq('status', 'PAID')
      .is('deleted_at', null)
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString())

    const { data: paymentsLastMonth } = await paymentsLastMonthQuery

    const lastMonthRevenue = (paymentsLastMonth || []).reduce((sum, payment) => {
      return sum + Number(payment.amount || 0)
    }, 0)

    const revenueGrowthPercent = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : monthlyRevenue > 0 ? 100 : 0

    return NextResponse.json({
      totalStudents: {
        value: totalStudents || 0,
        change: studentGrowthPercent,
        label: newStudents ? `${newStudents} new this month` : 'from last month'
      },
      activeEvents: {
        value: activeEvents || 0,
        change: eventsThisMonth || 0,
        label: eventsThisMonth ? `${eventsThisMonth} new this month` : 'upcoming'
      },
      attendanceRate: {
        value: attendanceRate,
        change: Math.round(attendanceRateChange * 10) / 10,
        label: 'from last month'
      },
      monthlyRevenue: {
        value: Math.round(monthlyRevenue * 100) / 100,
        change: revenueGrowthPercent,
        label: 'from last month'
      }
    })

  } catch (error) {
    console.error('Error fetching reports overview:', error)
    return NextResponse.json({ error: 'Failed to fetch overview stats' }, { status: 500 })
  }
}

