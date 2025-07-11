import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total students count
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })

    // Get students added this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: newStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Get students added last month
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    lastMonth.setDate(1)
    lastMonth.setHours(0, 0, 0, 0)

    const { count: lastMonthStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString())

    // Calculate student growth percentage
    const studentGrowthPercent = lastMonthStudents && newStudents ? 
      Math.round((newStudents / lastMonthStudents - 1) * 100) : 0

    const now = new Date()

    // Get total events count for active events
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gt('date', now.toISOString())

    // Get upcoming events
    const { count: upcomingEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gt('date', now.toISOString())

    // Get events this month
    const { count: eventsThisMonth } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', startOfMonth.toISOString())
      .lt('date', now.toISOString())

    // Calculate events this month percentage
    const eventsGrowthPercent = eventsThisMonth && totalEvents ? 
      Math.round((eventsThisMonth / totalEvents) * 100) : 0

    // Get total fees
    const { count: totalFees } = await supabase
      .from('fee_structures')
      .select('*', { count: 'exact', head: true })

    // Get total payments
    const { count: totalPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })

    // Get total amount collected
    const { data: totalAmountData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')

    const totalAmount = totalAmountData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Get total revenue from paid payments
    const { data: totalRevenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')

    const totalRevenue = totalRevenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Get this month's revenue
    const { data: monthlyAmountData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')
      .gte('payment_date', startOfMonth.toISOString())

    const monthlyAmount = monthlyAmountData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Get last month's revenue
    const { data: lastMonthRevenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')
      .gte('payment_date', lastMonth.toISOString())
      .lt('payment_date', startOfMonth.toISOString())

    const lastMonthRevenue = lastMonthRevenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    // Calculate revenue growth percentage
    const revenueGrowthPercent = lastMonthRevenue ? 
      Math.round((monthlyAmount / lastMonthRevenue - 1) * 100) : 0

    // Get pending payments count
    const { count: pendingPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')

    // Calculate unpaid fees percentage
    const { count: totalPaymentsCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })

    const unpaidFeesPercent = totalPaymentsCount && pendingPayments ? 
      Math.round((pendingPayments / totalPaymentsCount) * 100) : 0

    // Get recent students
    const { data: recentStudents } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    // Get recent payments
    const { data: recentPayments } = await supabase
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

    // Get recent events
    const { data: recentEvents } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false })
      .limit(5)

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
        events: recentEvents || []
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
} 