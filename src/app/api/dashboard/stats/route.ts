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
    // Allow administrative roles to access dashboard stats
    // EVENTS_STAFF and INTRAMURALS_STAFF have no dashboard access, so deny them
    if (!['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden - No dashboard access" }, { status: 403 })
    }

    // Get user's assigned college and course
    const userCollege = session.user.assigned_college
    const userCourse = session.user.assigned_course
    const userRole = session.user.role

    // Calculate date ranges
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    lastMonth.setDate(1)
    lastMonth.setHours(0, 0, 0, 0)

    const now = new Date()

    // Helper functions for role-based filtering
    const buildEventsQuery = (baseQuery: any) => {
      if (userRole === 'COLLEGE_ORG' && userCollege) {
        return baseQuery.eq('scope_type', 'COLLEGE_WIDE').eq('scope_college', userCollege)
      } else if (userRole === 'COURSE_ORG' && userCourse) {
        return baseQuery.eq('scope_type', 'COURSE_SPECIFIC').eq('scope_course', userCourse)
      }
      return baseQuery
    }

    const buildFeesQuery = (baseQuery: any) => {
      if (userRole === 'COLLEGE_ORG' && userCollege) {
        return baseQuery.eq('scope_type', 'COLLEGE_WIDE').eq('scope_college', userCollege)
      } else if (userRole === 'COURSE_ORG' && userCourse) {
        return baseQuery.eq('scope_type', 'COURSE_SPECIFIC').eq('scope_course', userCourse)
      }
      return baseQuery
    }

    // Build all queries (but don't execute yet)
    let studentsQuery = supabaseAdmin.from('students').select('*', { count: 'exact', head: true })
    let newStudentsQuery = supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString())
    let lastMonthStudentsQuery = supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).gte('created_at', lastMonth.toISOString()).lt('created_at', startOfMonth.toISOString())
    let recentStudentsQuery = supabaseAdmin.from('students').select('*').order('created_at', { ascending: false }).limit(5)

    // Apply role-based filtering for students
    if (userRole === 'COLLEGE_ORG' && userCollege) {
      studentsQuery = studentsQuery.eq('college', userCollege)
      newStudentsQuery = newStudentsQuery.eq('college', userCollege)
      lastMonthStudentsQuery = lastMonthStudentsQuery.eq('college', userCollege)
      recentStudentsQuery = recentStudentsQuery.eq('college', userCollege)
    } else if (userRole === 'COURSE_ORG' && userCourse) {
      studentsQuery = studentsQuery.eq('course', userCourse)
      newStudentsQuery = newStudentsQuery.eq('course', userCourse)
      lastMonthStudentsQuery = lastMonthStudentsQuery.eq('course', userCourse)
      recentStudentsQuery = recentStudentsQuery.eq('course', userCourse)
    }

    const totalEventsQuery = buildEventsQuery(supabaseAdmin.from('events').select('*', { count: 'exact', head: true }).gt('date', now.toISOString()))
    const upcomingEventsQuery = buildEventsQuery(supabaseAdmin.from('events').select('*', { count: 'exact', head: true }).gt('date', now.toISOString()))
    const eventsThisMonthQuery = buildEventsQuery(supabaseAdmin.from('events').select('*', { count: 'exact', head: true }).gte('date', startOfMonth.toISOString()).lt('date', now.toISOString()))
    const recentEventsQuery = buildEventsQuery(supabaseAdmin.from('events').select('*').order('date', { ascending: false }).limit(5))

    const totalFeesQuery = buildFeesQuery(supabaseAdmin.from('fee_structures').select('*', { count: 'exact', head: true }).is('deleted_at', null))
    const accessibleFeesQuery = buildFeesQuery(supabaseAdmin.from('fee_structures').select('id').is('deleted_at', null))

    // OPTIMIZATION: Execute ALL queries in parallel using Promise.all
    const [
      { count: totalStudents },
      { count: newStudents },
      { count: lastMonthStudents },
      { data: recentStudents },
      { count: totalEvents },
      { count: upcomingEvents },
      { count: eventsThisMonth },
      { data: recentEvents },
      { count: totalFees },
      { data: accessibleFees },
      { data: recentPayments },
      { data: recentActivities }
    ] = await Promise.all([
      studentsQuery,
      newStudentsQuery,
      lastMonthStudentsQuery,
      recentStudentsQuery,
      totalEventsQuery,
      upcomingEventsQuery,
      eventsThisMonthQuery,
      recentEventsQuery,
      totalFeesQuery,
      accessibleFeesQuery,
      supabaseAdmin.from('payments').select(`
        *,
        student:students(id, name, student_id),
        fee:fee_structures(id, name)
      `).order('payment_date', { ascending: false }).limit(5),
      supabaseAdmin.from('notifications').select('*').eq('type', 'SYSTEM_ACTIVITY').order('created_at', { ascending: false }).limit(20)
    ])

    // Get accessible fee IDs for payment filtering
    const accessibleFeeIds = accessibleFees?.map((f: { id: string }) => f.id) || []

    // Build payment count queries with fee filtering
    let totalPaymentsQuery = supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).is('deleted_at', null)
    let pendingPaymentsQuery = supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'PENDING').is('deleted_at', null)
    let totalPaymentsCountQuery = supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).is('deleted_at', null)

    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      totalPaymentsQuery = totalPaymentsQuery.in('fee_id', accessibleFeeIds)
      pendingPaymentsQuery = pendingPaymentsQuery.in('fee_id', accessibleFeeIds)
      totalPaymentsCountQuery = totalPaymentsCountQuery.in('fee_id', accessibleFeeIds)
    }

    // Execute payment count queries in parallel
    const [
      { count: totalPayments },
      { count: pendingPayments },
      { count: totalPaymentsCount }
    ] = await Promise.all([
      totalPaymentsQuery,
      pendingPaymentsQuery,
      totalPaymentsCountQuery
    ])

    // Fetch ALL payment amounts using pagination to avoid hitting Supabase limits
    const pageSize = 1000
    let allTotalAmountPayments: any[] = []
    let allMonthlyPayments: any[] = []
    let allLastMonthPayments: any[] = []
    
    // Helper function to fetch all payments with pagination
    const fetchAllPayments = async (baseQuery: any) => {
      let allPayments: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await baseQuery
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
          console.error('Error fetching payments:', error)
          break
        }

        if (data && data.length > 0) {
          allPayments = allPayments.concat(data)
          hasMore = data.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      return allPayments
    }

    // Build base queries for different time periods
    let totalAmountBaseQuery = supabaseAdmin.from('payments').select('amount').eq('status', 'PAID').is('deleted_at', null)
    let monthlyAmountBaseQuery = supabaseAdmin.from('payments').select('amount').eq('status', 'PAID').is('deleted_at', null).gte('payment_date', startOfMonth.toISOString())
    let lastMonthRevenueBaseQuery = supabaseAdmin.from('payments').select('amount').eq('status', 'PAID').is('deleted_at', null).gte('payment_date', lastMonth.toISOString()).lt('payment_date', startOfMonth.toISOString())

    if (accessibleFeeIds.length > 0 && (userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG')) {
      totalAmountBaseQuery = totalAmountBaseQuery.in('fee_id', accessibleFeeIds)
      monthlyAmountBaseQuery = monthlyAmountBaseQuery.in('fee_id', accessibleFeeIds)
      lastMonthRevenueBaseQuery = lastMonthRevenueBaseQuery.in('fee_id', accessibleFeeIds)
    }

    // Fetch all payments with pagination
    const [totalAmountData, monthlyAmountData, lastMonthRevenueData] = await Promise.all([
      fetchAllPayments(totalAmountBaseQuery),
      fetchAllPayments(monthlyAmountBaseQuery),
      fetchAllPayments(lastMonthRevenueBaseQuery)
    ])

    // Calculate aggregated values
    const totalAmount = totalAmountData.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
    const totalRevenue = totalAmountData.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
    const monthlyAmount = monthlyAmountData.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
    const lastMonthRevenue = lastMonthRevenueData.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)

    // Calculate percentages
    const studentGrowthPercent = lastMonthStudents && newStudents ? 
      Math.round((newStudents / lastMonthStudents - 1) * 100) : 0
    const eventsGrowthPercent = eventsThisMonth && totalEvents ? 
      Math.round((eventsThisMonth / totalEvents) * 100) : 0
    const revenueGrowthPercent = lastMonthRevenue ? 
      Math.round((monthlyAmount / lastMonthRevenue - 1) * 100) : 0
    const unpaidFeesPercent = totalPaymentsCount && pendingPayments ? 
      Math.round((pendingPayments / totalPaymentsCount) * 100) : 0

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