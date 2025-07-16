import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { buildFeesScopeFilter } from "@/lib/fee-scope-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params

    // Check if student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Get attendance records
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        event:events(
          id,
          title,
          description,
          date
        )
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }

    // Get fees that apply to this student based on scope
    const scopeFilter = buildFeesScopeFilter(student)
    const { data: fees, error: feesError } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(scopeFilter)
      .order('due_date', { ascending: false })

    if (feesError) {
      console.error('Error fetching fees:', feesError)
      return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
    }

    // Get student's payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        fee:fee_structures(
          id,
          name,
          amount,
          due_date
        )
      `)
      .eq('student_id', student.id)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Calculate payment statistics
    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0)
    const totalPaid = payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0)
    const totalPending = totalFees - totalPaid

    // Get upcoming events
    const now = new Date()
    const { data: upcomingEvents, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .gt('date', now.toISOString())
      .order('date', { ascending: true })
      .limit(5)

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Calculate attendance statistics
    const totalEvents = attendanceRecords?.length || 0
    const presentCount = attendanceRecords?.filter(r => r.status === 'PRESENT').length || 0
    const absentCount = attendanceRecords?.filter(r => r.status === 'ABSENT').length || 0
    const lateCount = attendanceRecords?.filter(r => r.status === 'LATE').length || 0
    const attendanceRate = totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : 0

    return NextResponse.json({
      student,
      attendance: {
        records: attendanceRecords || [],
        stats: {
          total: totalEvents,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          rate: attendanceRate
        }
      },
      payments: {
        records: payments || [],
        stats: {
          total: totalFees,
          paid: totalPaid,
          pending: totalPending
        }
      },
      upcomingEvents: upcomingEvents || []
    })

  } catch (error) {
    console.error('Error in GET /api/students/dashboard/[studentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 