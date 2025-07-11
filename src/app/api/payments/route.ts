import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { z } from "zod"

const paymentSchema = z.object({
  studentId: z.string().min(1),
  feeId: z.string().min(1),
  amount: z.number().min(0),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED', 'UNPAID', 'PARTIAL', 'OVERDUE']),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get pagination parameters from URL
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // Get all active fees
    const { data: fees, error: feesError } = await supabase
      .from('fee_structures')
      .select('id, name, type, amount, school_year, semester')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')

    if (feesError) {
      console.error('Error fetching fees:', feesError)
      return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
    }

    // Build students query with search filter
    let studentsQuery = supabase
      .from('students')
      .select('id, student_id, name, email, year_level, course, college')

    if (search) {
      studentsQuery = studentsQuery.or(`name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('students')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { count } = await countQuery

    // Get paginated students
    const { data: students, error: studentsError } = await studentsQuery
      .range(offset, offset + limit - 1)
      .order('name')

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // Get all payments for these students
    const studentIds = students?.map(s => s.id) || []
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .in('student_id', studentIds)
      .is('deleted_at', null)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Create payment lookup map
    const paymentMap = new Map()
    payments?.forEach((payment: any) => {
      const key = `${payment.student_id}-${payment.fee_id}`
      if (!paymentMap.has(key)) {
        paymentMap.set(key, [])
      }
      paymentMap.get(key).push(payment)
    })

    // Build the student payment data structure
    const studentsWithPayments = students?.map((student: any) => {
      const studentPayments = fees?.map((fee: any) => {
        const key = `${student.id}-${fee.id}`
        const studentFeePayments = paymentMap.get(key) || []
        
        const totalPaid = studentFeePayments
          .filter((p: any) => p.status === 'PAID')
          .reduce((sum: number, p: any) => sum + p.amount, 0)
        
        let status = 'UNPAID'
        if (totalPaid >= fee.amount) {
          status = 'PAID'
        } else if (totalPaid > 0) {
          status = 'PARTIAL'
        }

        const latestPayment = studentFeePayments.length > 0 
          ? studentFeePayments.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]
          : null

        return {
          feeId: fee.id,
          feeName: fee.name,
          feeAmount: fee.amount,
          paymentId: latestPayment?.id || null,
          status,
          amount: totalPaid,
          paymentDate: latestPayment?.payment_date || null,
          paymentMethod: latestPayment?.payment_method || null,
          reference: latestPayment?.reference || null,
          notes: latestPayment?.notes || null,
        }
      }) || []

      const totalFees = fees?.reduce((sum: number, fee: any) => sum + fee.amount, 0) || 0
      const totalPaid = studentPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0)

      return {
        student: {
          id: student.id,
          studentId: student.student_id,
          name: student.name,
          email: student.email,
          yearLevel: student.year_level,
          course: student.course,
        },
        payments: studentPayments,
        totalFees,
        totalPaid,
      }
    }) || []

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      students: studentsWithPayments,
      fees: fees?.map((fee: any) => ({
        id: fee.id,
        name: fee.name,
        type: fee.type,
        amount: fee.amount,
        schoolYear: fee.school_year,
        semester: fee.semester,
      })) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    })
  } catch (error) {
    console.error('Error in GET /api/payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data = paymentSchema.parse(body)

    // Find the student by their student_id (not internal id)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', data.studentId)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Check if fee exists
    const { data: fee, error: feeError } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('id', data.feeId)
      .single()

    if (feeError) {
      if (feeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
      }
      console.error('Error fetching fee:', feeError)
      return NextResponse.json({ error: 'Failed to fetch fee' }, { status: 500 })
    }

    // Check if payment already exists for this student-fee combination
    const { data: existingPayment, error: existingError } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', student.id)
      .eq('fee_id', fee.id)
      .is('deleted_at', null)
      .single()

    let payment
    if (existingPayment) {
      // Update existing payment
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          amount: data.amount,
          status: data.status,
          payment_method: data.paymentMethod || null,
          reference: data.reference || null,
          notes: data.notes || null,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
        .select(`
          *,
          student:students(
            id,
            student_id,
            name,
            email,
            college,
            course,
            year_level
          ),
          fee:fee_structures(
            id,
            name,
            amount,
            due_date,
            description
          )
        `)
        .single()

      if (updateError) {
        console.error('Error updating payment:', updateError)
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
      }
      payment = updatedPayment
    } else {
      // Create new payment record
      const { data: newPayment, error: createError } = await supabase
        .from('payments')
        .insert([{
          student_id: student.id,
          fee_id: fee.id,
          amount: data.amount,
          payment_date: new Date().toISOString(),
          status: data.status,
          payment_method: data.paymentMethod || null,
          reference: data.reference || null,
          notes: data.notes || null,
        }])
        .select(`
          *,
          student:students(
            id,
            student_id,
            name,
            email,
            college,
            course,
            year_level
          ),
          fee:fee_structures(
            id,
            name,
            amount,
            due_date,
            description
          )
        `)
        .single()

      if (createError) {
        console.error('Error creating payment:', createError)
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
      }
      payment = newPayment
    }

    return NextResponse.json(payment, { status: existingPayment ? 200 : 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 