import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

const approveSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can approve/reject payments
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = approveSchema.parse(body)

    // Get payment with student and fee information
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
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
          scope_type,
          scope_college,
          scope_course
        )
      `)
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if payment is already processed
    if (payment.approval_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: `Payment is already ${payment.approval_status.toLowerCase()}` 
      }, { status: 400 })
    }

    // Role-based permission check
    const fee = payment.fee as any
    const student = payment.student as any

    // Check if user has permission to approve this payment
    let hasPermission = false

    if (session.user.role === 'ADMIN') {
      // System Admin can approve all payments
      hasPermission = true
    } else if (session.user.role === 'COLLEGE_ORG') {
      // College Org can approve college-wide and course-specific fees for their college
      if (fee.scope_type === 'COLLEGE_WIDE' || fee.scope_type === 'COURSE_SPECIFIC') {
        hasPermission = fee.scope_college === session.user.assigned_college &&
                       student.college === session.user.assigned_college
      }
    } else if (session.user.role === 'COURSE_ORG') {
      // Course Org can only approve course-specific fees for their assigned course(s)
      if (fee.scope_type === 'COURSE_SPECIFIC') {
        const assignedCourses: string[] = (session.user as any).assigned_courses || (session.user.assigned_course ? [session.user.assigned_course] : []);
        const inCourse = assignedCourses.includes(fee.scope_course)
        hasPermission = fee.scope_college === session.user.assigned_college &&
                       inCourse &&
                       student.college === session.user.assigned_college &&
                       assignedCourses.includes(student.course)
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to approve this payment' 
      }, { status: 403 })
    }

    const now = new Date().toISOString()
    let updateData: any = {
      updated_at: now,
    }

    if (data.action === 'APPROVE') {
      updateData.approval_status = 'APPROVED'
      updateData.status = 'PAID'
      updateData.approved_by = session.user.id
      updateData.approved_at = now
      updateData.rejection_reason = null
      updateData.rejected_by = null
      updateData.rejected_at = null
    } else {
      updateData.approval_status = 'REJECTED'
      updateData.status = 'PENDING'
      updateData.rejected_by = session.user.id
      updateData.rejected_at = now
      updateData.rejection_reason = data.rejectionReason || 'Payment receipt was not verified'
      updateData.approved_by = null
      updateData.approved_at = null
    }

    // Update payment
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
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
          description,
          scope_type,
          scope_college,
          scope_course
        ),
        approver:users!payments_approved_by_fkey(
          id,
          name,
          email,
          role
        ),
        rejector:users!payments_rejected_by_fkey(
          id,
          name,
          email,
          role
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
    }

    // Log system activity for audit/recent activity purposes
    try {
      const student = (updatedPayment as any).student
      const feeInfo = (updatedPayment as any).fee
      const actorName = session.user.name || 'Unknown Admin'
      const actionVerb = data.action === 'APPROVE' ? 'approved' : 'rejected'
      const message = `${session.user.role} ${actorName} ${actionVerb} payment for ${feeInfo?.name} - ${student?.name} (${student?.student_id}).`
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: session.user.id,
          student_id: student?.id || null,
          type: 'SYSTEM_ACTIVITY',
          title: data.action === 'APPROVE' ? 'Payment Approved' : 'Payment Rejected',
          message,
          data: {
            action: data.action,
            fee_id: feeInfo?.id,
            fee_name: feeInfo?.name,
            amount: feeInfo?.amount,
            admin_role: session.user.role,
          },
          is_read: true,
          created_at: new Date().toISOString(),
        })
    } catch (e) {
      console.warn('Failed to log approval notification:', e)
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: data.action === 'APPROVE' 
        ? 'Payment approved successfully' 
        : 'Payment rejected successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in payment approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

