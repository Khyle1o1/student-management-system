import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

/**
 * Test endpoint to create sample notifications
 * DELETE THIS FILE IN PRODUCTION
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow admins to create test notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { type = 'TEST' } = body

    let notificationData: any = {
      userId: session.user.id,
      type: type,
      title: '',
      message: '',
      data: {}
    }

    switch (type) {
      case 'EVENT_PENDING':
        notificationData = {
          ...notificationData,
          title: 'New Event Pending Approval',
          message: 'A new event "Sample Test Event" has been created and requires your approval',
          data: {
            event_id: 'test-event-id',
            event_title: 'Sample Test Event',
            created_by: 'Test Organization'
          }
        }
        break
      
      case 'EVENT_APPROVED':
        notificationData = {
          ...notificationData,
          title: 'Event Approved ✅',
          message: 'Your event "Sample Test Event" has been approved and is now live!',
          data: {
            event_id: 'test-event-id',
            event_title: 'Sample Test Event'
          }
        }
        break
      
      case 'EVENT_REJECTED':
        notificationData = {
          ...notificationData,
          title: 'Event Rejected ❌',
          message: 'Your event "Sample Test Event" has been rejected. Reason: This is a test rejection',
          data: {
            event_id: 'test-event-id',
            event_title: 'Sample Test Event',
            reason: 'This is a test rejection'
          }
        }
        break
      
      case 'CERTIFICATE_READY':
        notificationData = {
          ...notificationData,
          title: 'Certificate Ready 🎉',
          message: 'Your certificate of participation for "Sample Event" is now ready for download',
          data: {
            event_id: 'test-event-id',
            certificate_id: 'test-cert-id',
            event_title: 'Sample Event'
          }
        }
        break
      
      default:
        notificationData = {
          ...notificationData,
          title: 'Test Notification',
          message: 'This is a test notification to verify the notification system is working correctly!',
          data: { test: true }
        }
    }

    const result = await createNotification(notificationData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification created successfully',
      notification: result.notification 
    })

  } catch (error) {
    console.error('Error creating test notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

