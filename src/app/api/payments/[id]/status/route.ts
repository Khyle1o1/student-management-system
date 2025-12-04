import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { getOrgAccessLevelFromSession } from "@/lib/org-permissions"
import { logActivity } from "@/lib/activity-logger"

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

    const orgAccessLevel = getOrgAccessLevelFromSession(session as any)

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

      // Ensure receipt number is unique per student (excluding this record)
      // A student can reuse the same receipt number, but different students cannot
      const currentStudentId = (existing as any).student_id
      
      const { data: existingWithReceipt, error: receiptCheckError } = await supabaseAdmin
        .from('payments')
        .select('id, student_id')
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

      // Check if receipt number is used by a different student
      if (existingWithReceipt && existingWithReceipt.length > 0) {
        const conflictingPayment = existingWithReceipt[0]
        
        // If the receipt is used by a different student, reject it
        if (conflictingPayment.student_id !== currentStudentId) {
          return NextResponse.json(
            { error: 'This receipt number is already used by another student. Each student must have unique receipt numbers.' },
            { status: 400 }
          )
        }
        // If it's the same student, allow the reuse (no error)
      }
    }

    // Prevent reverting PAID -> any other status unless ADMIN (super admin)
    if (existing.status === 'PAID' && status !== 'PAID' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only super admin can modify a paid record' },
        { status: 403 }
      )
    }

    // Role and scope checks for updating payment status
    const fee: any = (existing as any).fee
    const student: any = (existing as any).student
    let allowed = false

    if (session.user.role === 'ADMIN') {
      // Super admin can always update payment status
      allowed = true
    } else if (session.user.role === 'COLLEGE_ORG') {
      // College Org accounts:
      // - event-scoped: cannot toggle payment status
      // - finance-scoped and full college access can mark as paid for their students
      if (orgAccessLevel === "finance" || orgAccessLevel === "college") {
        const assignedCollege = (session.user as any).assigned_college

        if (!assignedCollege) {
          allowed = false
        } else {
          // Allow marking as paid for any fee assigned to students in their college,
          // regardless of who created the fee or its scope (college-wide, course-specific, or university-wide),
          // as long as the student belongs to their college and (when present) the fee's scope_college matches.
          const isStudentInCollege = student.college === assignedCollege
          const isFeeCollegeMatch =
            !fee.scope_college || fee.scope_college === assignedCollege

          allowed = isStudentInCollege && isFeeCollegeMatch
        }
      } else {
        allowed = false
      }
    } else {
      // Course Org accounts and all other roles (except ADMIN) cannot toggle payment status
      allowed = false
    }

    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient scope to update this payment status' },
        { status: 403 }
      )
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
        student:students(
          id,
          name,
          student_id,
          college,
          course
        ),
        fee:fee_structures(
          id,
          name,
          amount
        )
      `)
      .single()

    if (error) {
      console.error('Error updating payment status:', error)
      return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
    }

    // Log system activity as a notification and activity log for dashboard recent activities
    if (status === 'PAID') {
      const student = (payment as any).student
      const fee = (payment as any).fee
      const adminName = session.user.name || 'Unknown Admin'
      const message = `${session.user.role} ${adminName} marked ${fee?.name} fee for ${student?.name} (${student?.student_id}) as Paid (Receipt No: ${receiptNumber}).`

      try {
        // Notification entry (for recent activity widgets)
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

        // Mirror to activity_logs for timeline
        await logActivity({
          session,
          action: 'PAYMENT_MARKED_PAID',
          module: 'fees',
          targetType: 'payment',
          targetId: (payment as any)?.id,
          // Include both fee and student in the target label for better visibility in the timeline
          targetName: fee && student
            ? `${fee.name} - ${student.name} (${student.student_id})`
            : fee?.name || 'Payment',
          college: student?.college || null,
          course: student?.course || null,
          details: {
            fee_id: fee?.id,
            fee_name: fee?.name,
            amount: fee?.amount,
            student_id: student?.id,
            student_name: student?.name,
            student_number: student?.student_id,
            receipt_number: receiptNumber,
            payment_method: paymentMethod,
          },
        })
      } catch (logError) {
        console.warn('Failed to log payment marked as paid activity:', logError)
      }
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

