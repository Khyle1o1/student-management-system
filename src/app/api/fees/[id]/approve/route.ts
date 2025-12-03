import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { z } from "zod"

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
      try {
        const PAGE_SIZE = 1000
        let allStudents: { id: string }[] = []
        let page = 0
        let hasMore = true
        const scopeType = (updated as any).scope_type as string
        const scopeCollege = (updated as any).scope_college as string | null
        const scopeCourse = (updated as any).scope_course as string | null
        while (hasMore) {
          let pageQuery = supabaseAdmin
            .from('students')
            .select('id')
            .or('archived.is.null,archived.eq.false')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

          if (scopeType === 'COLLEGE_WIDE' && scopeCollege) {
            pageQuery = pageQuery.eq('college', scopeCollege)
          } else if (scopeType === 'COURSE_SPECIFIC' && scopeCourse) {
            pageQuery = pageQuery.eq('course', scopeCourse)
          }

          const { data: pageData, error: pageError } = await pageQuery
          if (pageError) {
            console.warn('Error fetching students for approval assignment:', pageError)
            break
          }
          if (pageData && pageData.length > 0) {
            allStudents = [...allStudents, ...pageData]
            if (pageData.length < PAGE_SIZE) {
              hasMore = false
            } else {
              page++
            }
          } else {
            hasMore = false
          }
        }

        if (allStudents && allStudents.length > 0) {
          const paymentRecords = allStudents.map(s => ({
            student_id: s.id,
            fee_id: (updated as any).id,
            amount: (updated as any).amount,
            status: 'UNPAID',
            payment_date: null,
          }))
          const BATCH_SIZE = 500
          for (let i = 0; i < paymentRecords.length; i += BATCH_SIZE) {
            const batch = paymentRecords.slice(i, i + BATCH_SIZE)
            await supabaseAdmin.from('payments').insert(batch)
          }
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


