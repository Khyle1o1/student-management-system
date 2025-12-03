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

    // Get event
    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if ((event as any).status !== 'PENDING') {
      return NextResponse.json({ error: `Event is already ${(event as any).status?.toLowerCase()}` }, { status: 400 })
    }

    const newStatus = data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating event status:', updateError)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    // Send notification to event creator if they're an organization
    try {
      // Get the event creator information
      const eventCreatorId = (event as any).created_by

      if (eventCreatorId && eventCreatorId !== session.user.id) {
        // Create notification for the event creator
        await supabaseAdmin.from('notifications').insert({
          user_id: eventCreatorId,
          type: data.action === 'APPROVE' ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
          title: data.action === 'APPROVE' ? 'Event Approved ✅' : 'Event Rejected ❌',
          message: data.action === 'APPROVE' 
            ? `Your event "${(updated as any)?.title}" has been approved and is now live!`
            : `Your event "${(updated as any)?.title}" has been rejected. ${data.reason ? 'Reason: ' + data.reason : ''}`,
          data: {
            action: data.action,
            event_id: (updated as any)?.id,
            event_title: (updated as any)?.title,
            reason: data.reason || null,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        })
      }

      // Log system activity for admin (existing notification)
      await supabaseAdmin.from('notifications').insert({
        user_id: session.user.id,
        type: 'SYSTEM_ACTIVITY',
        title: data.action === 'APPROVE' ? 'Event Approved' : 'Event Rejected',
        message: `${session.user.name || 'Admin'} ${data.action === 'APPROVE' ? 'approved' : 'rejected'} event "${(updated as any)?.title}"`,
        data: {
          action: data.action,
          event_id: (updated as any)?.id,
          reason: data.reason || null,
        },
        is_read: true,
        created_at: new Date().toISOString(),
      })

      // Mirror to activity_logs for timeline
      await logActivity({
        session,
        action: data.action === 'APPROVE' ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
        module: 'events',
        targetType: 'event',
        targetId: (updated as any)?.id,
        targetName: (updated as any)?.title,
        college: (updated as any)?.scope_college || null,
        course: (updated as any)?.scope_course || null,
        details: {
          status: (updated as any)?.status,
          action: data.action,
          reason: data.reason || null,
        },
      })
    } catch (e) {
      console.warn('Failed to create event approval notifications:', e)
    }

    return NextResponse.json({ success: true, event: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in POST /api/events/[id]/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


