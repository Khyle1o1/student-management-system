import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildFeesScopeFilter } from "@/lib/fee-scope-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params

    // Students can only access their own fee information
    if (session.user.role === "USER" && session.user.studentId !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find the student
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      console.error("Error fetching student:", studentError)
      return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
    }

    // Fetch fee structures that apply to this student based on scope
    const currentYear = new Date().getFullYear()
    
    // Build the scope filter correctly using the utility function
    const scopeFilter = buildFeesScopeFilter(student)
    
    const { data: fees, error: feesError } = await supabaseAdmin
      .from('fee_structures')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .eq('school_year', currentYear.toString())
      .or(scopeFilter)
      .order('name')

    if (feesError) {
      console.error("Error fetching fees:", feesError)
      return NextResponse.json({ error: "Failed to fetch fees" }, { status: 500 })
    }

    // Fetch all payments made by this student
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        fee:fee_structures(
          id,
          name,
          type,
          amount
        )
      `)
      .eq('student_id', student.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError)
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
    }

    // Create a map of fees that the student has paid for (including past years)
    const paidFeeIds = new Set()
    payments?.forEach((payment: any) => {
      paidFeeIds.add(payment.fee_id)
    })

    // Fetch any additional fees that student has payments for (from past years)
    const additionalFeeIds = Array.from(paidFeeIds).filter(feeId => 
      !fees?.some(fee => fee.id === feeId)
    )

    let additionalFees: any[] = []
    if (additionalFeeIds.length > 0) {
      const { data: extraFees, error: extraFeesError } = await supabaseAdmin
        .from('fee_structures')
        .select('*')
        .in('id', additionalFeeIds)

      if (!extraFeesError && extraFees) {
        additionalFees = extraFees
      }
    }

    // Combine current and additional fees
    const allFees = [...(fees || []), ...additionalFees]

    // Calculate summary statistics
    const totalFees = allFees.reduce((sum: number, fee: any) => sum + fee.amount, 0)
    const totalPaid = payments
      ?.filter((p: any) => p.status === 'PAID')
      .reduce((sum: number, p: any) => sum + p.amount, 0) || 0
    const totalPending = Math.max(totalFees - totalPaid, 0)
    const paymentProgress = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0

    const summary = {
      totalFees,
      totalPaid,
      totalPending,
      paymentProgress
    }

    // Format the data for the frontend
    const formattedFees = allFees.map((fee: any) => ({
      id: fee.id,
      name: fee.name,
      type: fee.type || 'OTHER',
      amount: fee.amount,
      description: fee.description || '',
      dueDate: fee.due_date,
      semester: fee.semester || '',
      schoolYear: fee.school_year || currentYear.toString(),
      scope_type: fee.scope_type || 'UNIVERSITY_WIDE',
      scope_college: fee.scope_college || '',
      scope_course: fee.scope_course || '',
    }))

    const formattedPayments = payments?.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      notes: payment.notes,
      paidAt: payment.payment_date,
      status: payment.status,
      approvalStatus: payment.approval_status || null, // Only set if approval_status exists
      receiptUrl: payment.receipt_url,
      rejectionReason: payment.rejection_reason,
      uploadedAt: payment.uploaded_at,
      fee: {
        id: payment.fee.id,
        name: payment.fee.name,
        type: payment.fee.type,
      }
    })) || []

    return NextResponse.json({
      fees: formattedFees,
      payments: formattedPayments,
      summary
    })
  } catch (error) {
    console.error("Error fetching student fees:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 