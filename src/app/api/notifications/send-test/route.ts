import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEventReminder, sendFeeReminder, sendCertificateNotification } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

// POST send a test notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, email } = body

    let result

    switch (type) {
      case 'event':
        result = await sendEventReminder(
          email,
          'Test Student',
          'Sample Event for Testing',
          'December 25, 2024',
          '10:00 AM - 12:00 PM',
          'Main Auditorium',
          '1day'
        )
        break

      case 'fee':
        result = await sendFeeReminder(
          email,
          'Test Student',
          'Sample Fee for Testing',
          350,
          'December 31, 2024',
          'assigned'
        )
        break

      case 'certificate':
        result = await sendCertificateNotification(
          email,
          'Test Student',
          'Certificate of Participation',
          'https://example.com/certificate/download/123'
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}

