import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get pagination and search parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // First get the fee details to determine scope
    const { data: fee, error: feeError } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('id', params.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (feeError) {
      if (feeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
      }
      console.error('Error fetching fee:', feeError)
      return NextResponse.json({ error: 'Failed to fetch fee' }, { status: 500 })
    }

    // Build students query based on fee scope
    let studentsQuery = supabase
      .from('students')
      .select(`
        id,
        student_id,
        name,
        email,
        college,
        course,
        year_level
      `)

    // Apply scope filtering
    if (fee.scope_type === 'COLLEGE_WIDE' && fee.scope_college) {
      studentsQuery = studentsQuery.eq('college', fee.scope_college)
    } else if (fee.scope_type === 'COURSE_SPECIFIC' && fee.scope_course) {
      studentsQuery = studentsQuery.eq('course', fee.scope_course)
    }
    // For UNIVERSITY_WIDE, no additional filtering needed

    // Apply search filter if provided
    if (search) {
      studentsQuery = studentsQuery.or(`name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Get total count for pagination (with same filters)
    let countQuery = supabase
      .from('students')
      .select('*', { count: 'exact', head: true })

    // Apply same scope filtering to count
    if (fee.scope_type === 'COLLEGE_WIDE' && fee.scope_college) {
      countQuery = countQuery.eq('college', fee.scope_college)
    } else if (fee.scope_type === 'COURSE_SPECIFIC' && fee.scope_course) {
      countQuery = countQuery.eq('course', fee.scope_course)
    }

    // Apply same search filter to count
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { count: totalStudents } = await countQuery

    // Get paginated students
    const { data: students, error: studentsError } = await studentsQuery
      .range(offset, offset + limit - 1)
      .order('name')

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // Get all payments for this fee and these specific students
    const studentIds = students?.map(s => s.id) || []
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('fee_id', params.id)
      .in('student_id', studentIds)
      .is('deleted_at', null)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Create a map of student payments for quick lookup
    const studentPayments = new Map()
    payments?.forEach((payment: any) => {
      const studentId = payment.student_id
      if (!studentPayments.has(studentId)) {
        studentPayments.set(studentId, [])
      }
      studentPayments.get(studentId).push(payment)
    })

    // Combine student data with payment information
    const studentsWithPayments = students?.map((student: any) => {
      const studentPaymentList = studentPayments.get(student.id) || []
      const totalPaid = studentPaymentList
        .filter((p: any) => p.status === 'PAID')
        .reduce((sum: number, p: any) => sum + p.amount, 0)
      
      let paymentStatus = 'UNPAID'
      if (totalPaid >= fee.amount) {
        paymentStatus = 'PAID'
      } else if (totalPaid > 0) {
        paymentStatus = 'PARTIAL'
      }

      return {
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        email: student.email,
        college: student.college,
        course: student.course,
        yearLevel: student.year_level,
        feeAmount: fee.amount,
        totalPaid,
        balance: fee.amount - totalPaid,
        paymentStatus,
        payments: studentPaymentList.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          paymentDate: p.payment_date,
          paymentMethod: p.payment_method,
          reference: p.reference,
          notes: p.notes,
        })),
      }
    }) || []

    // Calculate summary statistics for all students (not just current page)
    // Get total counts for all students matching the scope
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from('payments')
      .select('student_id, amount, status')
      .eq('fee_id', params.id)
      .is('deleted_at', null)

    if (allPaymentsError) {
      console.error('Error fetching all payments for summary:', allPaymentsError)
    }

    // Calculate summary stats
    const paidStudentIds = new Set()
    const partialStudentIds = new Set()
    let totalCollectedRevenue = 0

    allPayments?.forEach((payment: any) => {
      if (payment.status === 'PAID') {
        totalCollectedRevenue += payment.amount
        paidStudentIds.add(payment.student_id)
      }
    })

    // Calculate partial payments (students who paid something but not the full amount)
    const studentPaymentTotals = new Map()
    allPayments?.forEach((payment: any) => {
      if (payment.status === 'PAID') {
        const current = studentPaymentTotals.get(payment.student_id) || 0
        studentPaymentTotals.set(payment.student_id, current + payment.amount)
      }
    })

    studentPaymentTotals.forEach((totalPaid, studentId) => {
      if (totalPaid < fee.amount && totalPaid > 0) {
        partialStudentIds.add(studentId)
      }
    })

    const paidStudents = paidStudentIds.size
    const partialStudents = partialStudentIds.size
    const unpaidStudents = (totalStudents || 0) - paidStudents - partialStudents
    const totalExpectedRevenue = (totalStudents || 0) * fee.amount
    const collectionRate = totalStudents && totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0

    return NextResponse.json({
      fee: {
        id: fee.id,
        name: fee.name,
        amount: fee.amount,
        scope_type: fee.scope_type,
        scope_college: fee.scope_college,
        scope_course: fee.scope_course,
        due_date: fee.due_date,
      },
      students: studentsWithPayments,
      summary: {
        totalStudents: totalStudents || 0,
        paidStudents,
        partialStudents,
        unpaidStudents,
        totalExpectedRevenue,
        totalCollectedRevenue,
        collectionRate,
      },
      pagination: {
        page,
        limit,
        total: totalStudents || 0,
        totalPages: Math.ceil((totalStudents || 0) / limit),
        hasNext: page < Math.ceil((totalStudents || 0) / limit),
        hasPrev: page > 1,
      }
    })
  } catch (error) {
    console.error('Error in GET /api/fees/[id]/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 