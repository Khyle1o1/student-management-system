import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { markAllNotificationsAsRead } from "@/lib/notifications"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread_only') === 'true'
    
    const offset = (page - 1) * limit

    // Get user's student record if they are a student
    let studentId: string | null = null
    if (session.user.role === 'STUDENT') {
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (studentError || !studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }
      studentId = studentRecord.id
    }

    // Build query based on user role
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })

    // Filter notifications based on user role
    if (session.user.role === 'STUDENT' && studentId) {
      // Students see only their notifications
      query = query.eq('student_id', studentId)
    } else if (session.user.role === 'ADMIN') {
      // Admins can see all notifications or their own user notifications
      // For now, let's show all notifications for admins
    } else {
      // Other roles see only their user notifications
      query = query.eq('user_id', session.user.id)
    }

    // Filter unread notifications if requested
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // Check for non-expired notifications
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    const { data: notifications, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      page,
      limit,
      unread_count: unreadOnly ? count || 0 : undefined
    })

  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'mark_all_read') {
      // Get user's student record if they are a student
      let studentId: string | null = null
      if (session.user.role === 'STUDENT') {
        const { data: studentRecord, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (studentError || !studentRecord) {
          return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
        }
        studentId = studentRecord.id
      }

      const result = await markAllNotificationsAsRead(
        session.user.role !== 'STUDENT' ? session.user.id : undefined,
        studentId || undefined
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({
        message: 'All notifications marked as read',
        count: result.count
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 