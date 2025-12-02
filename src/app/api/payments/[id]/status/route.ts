import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { supabase } from "@/lib/supabase"

const updateStatusSchema = z.object({
  status: z.enum(['PAID', 'UNPAID', 'PENDING', 'OVERDUE']),
  receiptNumber: z.string().trim().min(1, 'Receipt number is required').optional(),
  paymentMethod: z.enum(['BANK_TRANSFER', 'GCASH', 'ON_SITE']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, receiptNumber, paymentMethod } = updateStatusSchema.parse(body)

    // Fetch existing payment for checks and joins
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        student:students(id, name, student_id, college, course),
        fee:fee_structures(id, name, amount, scope_type, scope_college, scope_course)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Enforce rules: require receipt + payment method when marking PAID
    if (status === 'PAID') {
      if (!receiptNumber) {
        return NextResponse.json(
          { error: 'Receipt number is required to mark as Paid' },
          { status: 400 }
        )
      }
      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Payment method is required to mark as Paid' },
          { status: 400 }
        )
      }

      // Ensure receipt number is unique across payments (excluding this record)
      const { data: existingWithReceipt, error: receiptCheckError } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('reference', receiptNumber)
        .neq('id', id)
        .is('deleted_at', null)
        .limit(1)

      if (receiptCheckError) {
        console.error('Error checking receipt uniqueness:', receiptCheckError)
        return NextResponse.json(
          { error: 'Failed to validate receipt number, please try again.' },
          { status: 500 }
        )
      }

      if (existingWithReceipt && existingWithReceipt.length > 0) {
        return NextResponse.json(
          { error: 'This receipt number is already used for another payment.' },
          { status: 400 }
        )
      }
    }

    // Prevent reverting PAID -> UNPAID unless ADMIN (super admin)
    if (existing.status === 'PAID' && status !== 'PAID' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only super admin can modify a paid record' }, { status: 403 })
    }

    // Role and scope checks for marking payments
    const fee: any = (existing as any).fee
    const student: any = (existing as any).student
    let allowed = false

    if (session.user.role === 'ADMIN') {
      allowed = true
    } else if (session.user.role === 'COLLEGE_ORG') {
      // College Org: only within their college; cannot mark course-specific fees
      const isCollegeWide = fee.scope_type === 'COLLEGE_WIDE'
      allowed = isCollegeWide &&
        fee.scope_college === session.user.assigned_college &&
        student.college === session.user.assigned_college
    } else if (session.user.role === 'COURSE_ORG') {
      // Course Org: only course-specific within their assigned course(s)
      if (fee.scope_type === 'COURSE_SPECIFIC') {
        const assignedCourses: string[] = (session.user as any).assigned_courses || (session.user.assigned_course ? [session.user.assigned_course] : [])
        allowed = fee.scope_college === session.user.assigned_college &&
          assignedCourses.includes(fee.scope_course) &&
          student.college === session.user.assigned_college &&
          assignedCourses.includes(student.course)
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: insufficient scope to mark this payment' }, { status: 403 })
    }

    // Prepare update
    const updateData: any = {
      status,
      payment_date: status === 'PAID' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    if (status === 'PAID') {
      updateData.reference = receiptNumber
      updateData.payment_method = paymentMethod || null
      updateData.approved_by = session.user.id
      updateData.approved_at = new Date().toISOString()
    }

    // Update payment status
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        student:students(id, name, student_id),
        fee:fee_structures(id, name, amount)
      `)
      .single()

    if (error) {
      console.error('Error updating payment status:', error)
      return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
    }

    // Log system activity as a notification for dashboard recent activities
    if (status === 'PAID') {
      const student = (payment as any).student
      const fee = (payment as any).fee
      const adminName = session.user.name || 'Unknown Admin'
      const message = `${session.user.role} ${adminName} marked ${fee?.name} fee for ${student?.name} (${student?.student_id}) as Paid (Receipt No: ${receiptNumber}).`
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: session.user.id,
          student_id: student?.id || null,
          type: 'SYSTEM_ACTIVITY',
          title: 'Payment Marked as Paid',
          message,
          data: {
            action: 'MARKED_PAID',
            receipt_number: receiptNumber,
            fee_id: fee?.id,
            fee_name: fee?.name,
            amount: fee?.amount,
            admin_role: session.user.role
          },
          is_read: true, // system log, not an inbox item
          created_at: new Date().toISOString()
        })
    }

    return NextResponse.json({
      success: true,
      payment,
      message: 'Payment status updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in PATCH /api/payments/[id]/status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

