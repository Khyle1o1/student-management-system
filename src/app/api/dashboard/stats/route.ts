import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // Allow all administrative roles to access dashboard stats
    if (!['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get user's assigned college and course
    const userCollege = session.user.assigned_college
    const userCourse = session.user.assigned_course
    const userRole = session.user.role

    // Build student query with role-based filtering
    let studentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })

    // Apply role-based filtering for students
    if (userRole === 'COLLEGE_ORG' && userCollege) {
      studentsQuery = studentsQuery.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      studentsQuery = studentsQuery.eq('course', userCourse)
    }
    // ADMIN has no restrictions

    // Get total students count
    const { count: totalStudents } = await studentsQuery

    // Get students added this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    let newStudentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Apply same filtering for new students
    if (userRole === 'COLLEGE_ORG' && userCollege) {
      newStudentsQuery = newStudentsQuery.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      newStudentsQuery = newStudentsQuery.eq('course', userCourse)
    }

    const { count: newStudents } = await newStudentsQuery

    // Get students added last month
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    lastMonth.setDate(1)
    lastMonth.setHours(0, 0, 0, 0)

    let lastMonthStudentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString())

    // Apply same filtering for last month students
    if (userRole === 'COLLEGE_ORG' && userCollege) {
      lastMonthStudentsQuery = lastMonthStudentsQuery.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      lastMonthStudentsQuery = lastMonthStudentsQuery.eq('course', userCourse)
    }

    const { count: lastMonthStudents } = await lastMonthStudentsQuery

    // Calculate student growth percentage
    const studentGrowthPercent = lastMonthStudents && newStudents ? 
      Math.round((newStudents / lastMonthStudents - 1) * 100) : 0

    const now = new Date()

    // Build events query with role-based filtering
    let eventsBaseQuery = supabaseAdmin.from('events')

    // Apply role-based filtering for events
    const buildEventsQuery = (baseQuery: any) => {
      if (userRole === 'COLLEGE_ORG' && userCollege) {
        // COLLEGE_ORG sees ONLY their college's events (not university-wide)
        return baseQuery.eq('scope_type', 'COLLEGE_WIDE').eq('scope_college', userCollege)
      } else if (userRole === 'COURSE_ORG' && userCourse) {
        // COURSE_ORG sees ONLY their course's events (not university-wide or college)
        return baseQuery.eq('scope_type', 'COURSE_SPECIFIC').eq('scope_course', userCourse)
      }
      return baseQuery // ADMIN sees all
    }

    // Get total events count for active events
    let totalEventsQuery = buildEventsQuery(
      supabaseAdmin.from('events')
        .select('*', { count: 'exact', head: true })
        .gt('date', now.toISOString())
    )
    const { count: totalEvents } = await totalEventsQuery

    // Get upcoming events
    let upcomingEventsQuery = buildEventsQuery(
      supabaseAdmin.from('events')
        .select('*', { count: 'exact', head: true })
        .gt('date', now.toISOString())
    )
    const { count: upcomingEvents } = await upcomingEventsQuery

    // Get events this month
    let eventsThisMonthQuery = buildEventsQuery(
      supabaseAdmin.from('events')
        .select('*', { count: 'exact', head: true })
        .gte('date', startOfMonth.toISOString())
        .lt('date', now.toISOString())
    )
    const { count: eventsThisMonth } = await eventsThisMonthQuery

    // Calculate events this month percentage
    const eventsGrowthPercent = eventsThisMonth && totalEvents ? 
      Math.round((eventsThisMonth / totalEvents) * 100) : 0

    // Build fees query with role-based filtering
    const buildFeesQuery = (baseQuery: any) => {
      if (userRole === 'COLLEGE_ORG' && userCollege) {
        // COLLEGE_ORG sees ONLY their college's fees (not university-wide)
        return baseQuery.eq('scope_type', 'COLLEGE_WIDE').eq('scope_college', userCollege)
      } else if (userRole === 'COURSE_ORG' && userCourse) {
        // COURSE_ORG sees ONLY their course's fees (not university-wide or college)
        return baseQuery.eq('scope_type', 'COURSE_SPECIFIC').eq('scope_course', userCourse)
      }
      return baseQuery // ADMIN sees all
    }

    // Get total fees
    let totalFeesQuery = buildFeesQuery(
      supabaseAdmin.from('fee_structures')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
    )
    const { count: totalFees } = await totalFeesQuery

    // Get accessible fee IDs based on user role (for filtering payments)
    let accessibleFeesQuery = buildFeesQuery(
      supabaseAdmin.from('fee_structures')
        .select('id')
        .is('deleted_at', null)
    )
    const { data: accessibleFees } = await accessibleFeesQuery
    const accessibleFeeIds = accessibleFees?.map((f: { id: string }) => f.id) || []

    // Get total payments (filtered by accessible fees)
    let totalPaymentsQuery = supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
    
    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      totalPaymentsQuery = totalPaymentsQuery.in('fee_id', accessibleFeeIds)
    }
    const { count: totalPayments } = await totalPaymentsQuery

    // Get total amount collected (filtered by accessible fees)
    let totalAmountQuery = supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')
    
    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      totalAmountQuery = totalAmountQuery.in('fee_id', accessibleFeeIds)
    }
    const { data: totalAmountData } = await totalAmountQuery
    const totalAmount = totalAmountData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Get total revenue from paid payments (filtered by accessible fees)
    let totalRevenueQuery = supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')
    
    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      totalRevenueQuery = totalRevenueQuery.in('fee_id', accessibleFeeIds)
    }
    const { data: totalRevenueData } = await totalRevenueQuery
    const totalRevenue = totalRevenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Get this month's revenue (filtered by accessible fees)
    let monthlyAmountQuery = supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')
      .gte('payment_date', startOfMonth.toISOString())
    
    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      monthlyAmountQuery = monthlyAmountQuery.in('fee_id', accessibleFeeIds)
    }
    const { data: monthlyAmountData } = await monthlyAmountQuery
    const monthlyAmount = monthlyAmountData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Get last month's revenue (filtered by accessible fees)
    let lastMonthRevenueQuery = supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')
      .gte('payment_date', lastMonth.toISOString())
      .lt('payment_date', startOfMonth.toISOString())
    
    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      lastMonthRevenueQuery = lastMonthRevenueQuery.in('fee_id', accessibleFeeIds)
    }
    const { data: lastMonthRevenueData } = await lastMonthRevenueQuery
    const lastMonthRevenue = lastMonthRevenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Calculate revenue growth percentage
    const revenueGrowthPercent = lastMonthRevenue ? 
      Math.round((monthlyAmount / lastMonthRevenue - 1) * 100) : 0

    // Get pending payments count (filtered by accessible fees)
    let pendingPaymentsQuery = supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
    
    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      pendingPaymentsQuery = pendingPaymentsQuery.in('fee_id', accessibleFeeIds)
    }
    const { count: pendingPayments } = await pendingPaymentsQuery

    // Calculate unpaid fees percentage (filtered by accessible fees)
    let totalPaymentsCountQuery = supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
    
    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      totalPaymentsCountQuery = totalPaymentsCountQuery.in('fee_id', accessibleFeeIds)
    }
    const { count: totalPaymentsCount } = await totalPaymentsCountQuery

    const unpaidFeesPercent = totalPaymentsCount && pendingPayments ? 
      Math.round((pendingPayments / totalPaymentsCount) * 100) : 0

    // Get recent students with role-based filtering
    let recentStudentsQuery = supabaseAdmin
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (userRole === 'COLLEGE_ORG' && userCollege) {
      recentStudentsQuery = recentStudentsQuery.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      recentStudentsQuery = recentStudentsQuery.eq('course', userCourse)
    }

    const { data: recentStudents } = await recentStudentsQuery

    // Get recent payments
    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        student:students(
          id,
          name,
          student_id
        ),
        fee:fee_structures(
          id,
          name
        )
      `)
      .order('payment_date', { ascending: false })
      .limit(5)

    // Get recent events with role-based filtering
    let recentEventsQuery = buildEventsQuery(
      supabaseAdmin.from('events')
        .select('*')
        .order('date', { ascending: false })
        .limit(5)
    )
    const { data: recentEvents } = await recentEventsQuery

    // Get recent system activities (from notifications table)
    const { data: recentActivities } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('type', 'SYSTEM_ACTIVITY')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      students: {
        total: totalStudents || 0,
        new: newStudents || 0,
        growthPercent: studentGrowthPercent
      },
      events: {
        total: totalEvents || 0,
        upcoming: upcomingEvents || 0,
        thisMonth: eventsThisMonth || 0,
        growthPercent: eventsGrowthPercent
      },
      fees: {
        total: totalFees || 0
      },
      payments: {
        total: totalPayments || 0,
        amount: {
          total: totalAmount,
          monthly: monthlyAmount
        },
        pending: pendingPayments || 0,
        unpaidPercent: unpaidFeesPercent
      },
      revenue: {
        total: totalRevenue,
        monthly: monthlyAmount,
        growthPercent: revenueGrowthPercent
      },
      recent: {
        students: recentStudents || [],
        payments: recentPayments || [],
        events: recentEvents || [],
        activities: recentActivities || []
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
} 