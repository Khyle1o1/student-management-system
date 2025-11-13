import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET notification logs with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('notification_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('notification_type', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`recipient_email.ilike.%${search}%,recipient_name.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      logs: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching notification logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification logs' },
      { status: 500 }
    )
  }
}

// POST create a new notification log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        recipient_email: body.recipient_email,
        recipient_name: body.recipient_name,
        subject: body.subject,
        notification_type: body.notification_type,
        status: body.status || 'pending',
        message_id: body.message_id,
        error_message: body.error_message,
        event_id: body.event_id,
        fee_id: body.fee_id,
        certificate_id: body.certificate_id,
        student_id: body.student_id,
        email_html: body.email_html,
        email_text: body.email_text,
        sent_at: body.sent_at,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating notification log:', error)
    return NextResponse.json(
      { error: 'Failed to create notification log' },
      { status: 500 }
    )
  }
}

