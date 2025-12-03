import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth, getStudentByEmail } from "@/lib/auth"
import { markAllNotificationsAsRead } from "@/lib/notifications"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

// Log when module is loaded
console.log('🔔 [NOTIFICATIONS API] Route module loaded at:', new Date().toISOString())

export async function GET(request: Request) {
  console.log('🔔 [NOTIFICATIONS API] GET /api/notifications called')
  console.log('🔔 [NOTIFICATIONS API] Request URL:', request.url)
  
  try {
    console.log('🔔 [NOTIFICATIONS API] Attempting to get session...')
    const session = await auth()
    console.log('🔔 [NOTIFICATIONS API] Session:', session ? `Found (role: ${session.user.role})` : 'Not found')
    
    if (!session) {
      console.log('🔔 [NOTIFICATIONS API] No session, returning 401')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread_only') === 'true'
    
    console.log('🔔 [NOTIFICATIONS API] Query params:', { page, limit, unreadOnly })
    
    const offset = (page - 1) * limit

    // Get user's student record if they are a student
    // For Google OAuth users, session.user.id is the OAuth ID (not UUID), so we lookup by email instead
    let studentId: string | null = null
    if (session.user.role === 'USER') {
      console.log('🔔 [NOTIFICATIONS API] Looking up student record for email:', session.user.email)
      
      // Try to get student by email (works for both regular and OAuth users)
      const studentRecord = await getStudentByEmail(session.user.email || '')

      console.log('🔔 [NOTIFICATIONS API] Student lookup result:', {
        found: !!studentRecord,
        studentId: studentRecord?.id
      })

      if (!studentRecord) {
        console.log('🔔 [NOTIFICATIONS API] Student record not found, returning 404')
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }
      studentId = studentRecord.id
      console.log('🔔 [NOTIFICATIONS API] Student ID found:', studentId)
    }

    // Build query based on user role
    const role = session.user.role
    console.log('🔔 [NOTIFICATIONS API] Building query for role:', role)
    // Use service-role client so we don't depend on RLS for basic reads,
    // then manually scope rows based on the authenticated user's role.
    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })

    // Filter notifications based on user role
    if (role === 'USER' && studentId) {
      // Students see only their notifications
      console.log('🔔 [NOTIFICATIONS API] Filtering by student_id:', studentId)
      query = query.eq('student_id', studentId)
    } else if (role === 'ADMIN') {
      // Admins can see all notifications or their own user notifications
      // For now, let's show all notifications for admins
      console.log('🔔 [NOTIFICATIONS API] Admin user - showing all notifications')
    } else {
      // Other roles see only their user notifications
      console.log('🔔 [NOTIFICATIONS API] Filtering by user_id:', session.user.id)
      query = query.eq('user_id', session.user.id)

      // For organization accounts, only show meaningful outcome notifications
      // (e.g. when their event/fee is approved or rejected), not system logs.
      if (role === 'COLLEGE_ORG' || role === 'COURSE_ORG') {
        query = query.in('type', ['EVENT_APPROVED', 'EVENT_REJECTED', 'FEE_APPROVED', 'FEE_REJECTED'])
      }
    }

    // Filter unread notifications if requested
    if (unreadOnly) {
      console.log('🔔 [NOTIFICATIONS API] Filtering unread notifications only')
      query = query.eq('is_read', false)
    }

    // Check for non-expired notifications (null or future dates)
    // Filter out expired notifications - only show null expires_at or future dates
    const now = new Date().toISOString()
    console.log('🔔 [NOTIFICATIONS API] Applying expires_at filter, now:', now)
    query = query.or(`expires_at.is.null,expires_at.gt.${now}`)

    console.log('🔔 [NOTIFICATIONS API] Executing query...')
    const { data: notifications, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })
    
    console.log('🔔 [NOTIFICATIONS API] Query executed, error:', error?.message || 'none')

    if (error) {
      console.error('🔔 [NOTIFICATIONS API] Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    console.log('🔔 [NOTIFICATIONS API] Successfully fetched notifications:', {
      count: notifications?.length || 0,
      total: count || 0,
      unreadOnly
    })

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      page,
      limit,
      unread_count: unreadOnly ? count || 0 : undefined
    })

  } catch (error) {
    console.error('🔔 [NOTIFICATIONS API] Exception in GET /api/notifications:', error)
    console.error('🔔 [NOTIFICATIONS API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  console.log('🔔 [NOTIFICATIONS API] PATCH /api/notifications called')
  try {
    const session = await auth()
    if (!session) {
      console.log('🔔 [NOTIFICATIONS API] PATCH: No session, returning 401')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'mark_all_read') {
      // Get user's student record if they are a student
      // For Google OAuth users, session.user.id is the OAuth ID (not UUID), so we lookup by email instead
      let studentId: string | null = null
      if (session.user.role === 'USER') {
        const studentRecord = await getStudentByEmail(session.user.email || '')

        if (!studentRecord) {
          return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
        }
        studentId = studentRecord.id
      }

      const result = await markAllNotificationsAsRead(
        session.user.role !== 'USER' ? session.user.id : undefined,
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
    console.error('🔔 [NOTIFICATIONS API] Exception in PATCH /api/notifications:', error)
    console.error('🔔 [NOTIFICATIONS API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 