import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"

const approveSchema = z.object({
  action: z.enum(["APPROVE","REJECT"]),
  reason: z.string().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const data = approveSchema.parse(body)

    const { data: fee, error: fetchError } = await supabaseAdmin
      .from('fee_structures')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !fee) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    if ((fee as any).is_active && data.action === 'APPROVE') {
      return NextResponse.json({ error: 'Fee already active' }, { status: 400 })
    }

    if (data.action === 'APPROVE') {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('fee_structures')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (updateError) {
        console.error('Error approving fee:', updateError)
        return NextResponse.json({ error: 'Failed to approve fee' }, { status: 500 })
      }
      // Assign payments to eligible students now that fee is active
      // Use the assign_fee_to_students RPC function to avoid duplicates
      try {
        const scopeType = (updated as any).scope_type as string
        const scopeCollege = (updated as any).scope_college as string | null
        const scopeCourse = (updated as any).scope_course as string | null
        const exemptedStudents = (updated as any).exempted_students || []

        const { data: assignResult, error: assignError } = await supabaseAdmin
          .rpc('assign_fee_to_students', {
            p_fee_id: (updated as any).id,
            p_amount: (updated as any).amount,
            p_scope_type: scopeType,
            p_scope_college: scopeCollege,
            p_scope_course: scopeCourse,
            p_exempted_student_ids: exemptedStudents
          })

        if (assignError) {
          console.error('Error assigning fee to students during approval:', assignError)
        } else if (assignResult && assignResult.length > 0) {
          console.log(`✅ Assigned fee to ${assignResult[0].total_assigned} students during approval`)
        }
      } catch (assignErr) {
        console.warn('Fee approval: failed to assign payments:', assignErr)
      }

      // Notify fee creator (college_org / course_org) that their fee is now approved
      try {
        const feeCreatorId = (fee as any).created_by
        if (feeCreatorId && feeCreatorId !== session.user.id) {
          await supabaseAdmin.from('notifications').insert({
            user_id: feeCreatorId,
            type: 'FEE_APPROVED',
            title: 'Fee Approved ✅',
            message: `Your fee "${(updated as any).name}" has been approved and is now active.`,
            data: {
              action: 'FEE_APPROVED',
              fee_id: (updated as any).id,
              scope_type: (updated as any).scope_type,
              scope_college: (updated as any).scope_college,
              scope_course: (updated as any).scope_course,
            },
            is_read: false,
            created_at: new Date().toISOString(),
          })
        }

        // Log system activity for admin
        await supabaseAdmin.from('notifications').insert({
          user_id: session.user.id,
          type: 'SYSTEM_ACTIVITY',
          title: 'Fee Approved',
          message: `${session.user.name || 'Admin'} approved fee "${(updated as any).name}"`,
          data: {
            action: 'FEE_APPROVED',
            fee_id: (updated as any).id,
            scope_type: (updated as any).scope_type,
            scope_college: (updated as any).scope_college,
            scope_course: (updated as any).scope_course,
          },
          is_read: true,
          created_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn('Failed to create fee approval notifications:', e)
      }

      // Activity log entry
      await logActivity({
        session,
        action: "PAYMENT_APPROVED",
        module: "fees",
        targetType: "fee",
        targetId: (updated as any).id,
        targetName: (updated as any).name,
        college: (updated as any).scope_college,
        course: (updated as any).scope_course,
        details: {
          action: "APPROVE",
          scope_type: (updated as any).scope_type,
        },
      })

      return NextResponse.json({ success: true, fee: updated })
    } else {
      // REJECT: keep inactive; optionally mark deleted_at
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('fee_structures')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (updateError) {
        console.error('Error rejecting fee:', updateError)
        return NextResponse.json({ error: 'Failed to reject fee' }, { status: 500 })
      }
      try {
        const feeCreatorId = (fee as any).created_by

        // Notify creator about rejection
        if (feeCreatorId && feeCreatorId !== session.user.id) {
          await supabaseAdmin.from('notifications').insert({
            user_id: feeCreatorId,
            type: 'FEE_REJECTED',
            title: 'Fee Rejected ❌',
            message: data.reason
              ? `Your fee "${(updated as any).name}" was rejected. Reason: ${data.reason}`
              : `Your fee "${(updated as any).name}" was rejected.`,
            data: { action: 'FEE_REJECTED', fee_id: (updated as any).id, reason: data.reason || null },
            is_read: false,
            created_at: new Date().toISOString(),
          })
        }

        // System activity for admin
        await supabaseAdmin.from('notifications').insert({
          user_id: session.user.id,
          type: 'SYSTEM_ACTIVITY',
          title: 'Fee Rejected',
          message: `${session.user.name || 'Admin'} rejected fee "${(updated as any).name}"`,
          data: { action: 'FEE_REJECTED', fee_id: (updated as any).id, reason: data.reason || null },
          is_read: true,
          created_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn('Failed to create fee rejection notifications:', e)
      }

      // Activity log entry
      await logActivity({
        session,
        action: "PAYMENT_REJECTED",
        module: "fees",
        targetType: "fee",
        targetId: (updated as any).id,
        targetName: (updated as any).name,
        college: (updated as any).scope_college,
        course: (updated as any).scope_course,
        details: {
          action: "REJECT",
          reason: data.reason || null,
        },
      })
      return NextResponse.json({ success: true, fee: updated })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in POST /api/fees/[id]/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


