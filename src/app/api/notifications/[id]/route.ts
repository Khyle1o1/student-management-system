import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { markNotificationAsRead, deleteNotification } from "@/lib/notifications"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const { action } = body

    // Verify notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      console.error('Error fetching notification:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 })
    }

    // Check ownership
    let hasAccess = false
    
    if (session.user.role === 'ADMIN') {
      // Admins can access all notifications
      hasAccess = true
    } else if (session.user.role === 'STUDENT') {
      // Students can only access their own notifications
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (studentError || !studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }

      hasAccess = notification.student_id === studentRecord.id
    } else {
      // Other users can access their user notifications
      hasAccess = notification.user_id === session.user.id
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (action === 'mark_read') {
      const result = await markNotificationAsRead(id)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Notification marked as read',
        notification: result.notification
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in PATCH /api/notifications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params

    // Verify notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      console.error('Error fetching notification:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 })
    }

    // Check ownership
    let hasAccess = false
    
    if (session.user.role === 'ADMIN') {
      // Admins can delete all notifications
      hasAccess = true
    } else if (session.user.role === 'STUDENT') {
      // Students can only delete their own notifications
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (studentError || !studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }

      hasAccess = notification.student_id === studentRecord.id
    } else {
      // Other users can delete their user notifications
      hasAccess = notification.user_id === session.user.id
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const result = await deleteNotification(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notification deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/notifications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 