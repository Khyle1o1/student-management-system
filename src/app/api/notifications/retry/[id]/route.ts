import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

// POST retry a failed notification
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Get the notification log
    const { data: log, error: fetchError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !log) {
      return NextResponse.json(
        { error: 'Notification log not found' },
        { status: 404 }
      )
    }

    // Check if it's a failed notification
    if (log.status !== 'failed') {
      return NextResponse.json(
        { error: 'Can only retry failed notifications' },
        { status: 400 }
      )
    }

    // Update status to retrying
    await supabase
      .from('notification_logs')
      .update({ status: 'retrying' })
      .eq('id', id)

    // Attempt to resend the email
    const result = await sendEmail({
      to: log.recipient_email,
      subject: log.subject,
      html: log.email_html,
      text: log.email_text || undefined,
    })

    // Update the log based on result
    const updateData = result.success
      ? {
          status: 'sent',
          message_id: result.messageId,
          sent_at: new Date().toISOString(),
          error_message: null,
        }
      : {
          status: 'failed',
          error_message: result.error || 'Unknown error',
        }

    const { data: updatedLog, error: updateError } = await supabase
      .from('notification_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: result.success,
      log: updatedLog,
    })
  } catch (error) {
    console.error('Error retrying notification:', error)
    return NextResponse.json(
      { error: 'Failed to retry notification' },
      { status: 500 }
    )
  }
}

