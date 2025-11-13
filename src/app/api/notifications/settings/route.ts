import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET notification settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching notification settings:', error)
      
      // If no settings exist, create default settings
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            enabled: true,
            sender_email: 'noreply@smartu.edu',
            sender_name: 'SmartU',
            reply_to: 'support@smartu.edu',
            event_reminder_1_day: true,
            event_reminder_1_hour: true,
            fee_reminder_on_assignment: true,
            fee_reminder_3_days: true,
            certificate_notification: true,
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        return NextResponse.json(newSettings)
      }

      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in notification settings GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

// PUT update notification settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('notification_settings')
      .update({
        enabled: body.enabled,
        sender_email: body.sender_email,
        sender_name: body.sender_name,
        reply_to: body.reply_to,
        event_reminder_1_day: body.event_reminder_1_day,
        event_reminder_1_hour: body.event_reminder_1_hour,
        fee_reminder_on_assignment: body.fee_reminder_on_assignment,
        fee_reminder_3_days: body.fee_reminder_3_days,
        certificate_notification: body.certificate_notification,
      })
      .eq('id', body.id || '00000000-0000-0000-0000-000000000001')
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    )
  }
}

