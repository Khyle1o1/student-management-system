import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth, getStudentByEmail } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Check and create notifications for:
 * 1. Events that require evaluation but student hasn't completed
 * 2. Certificates that are ready to download but haven't been downloaded yet
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only students can use this endpoint
    if (session.user.role !== 'USER') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log('🔔 [NOTIFICATIONS CHECK] Checking pending notifications for student')

    // Get student record
    const studentRecord = await getStudentByEmail(session.user.email || '')
    if (!studentRecord) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    const notificationsCreated = []

    // 1. Check for pending evaluations
    console.log('🔔 [NOTIFICATIONS CHECK] Checking for pending evaluations...')
    
    // Get all events where student attended and evaluation is required
    const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select(`
        *,
        event:events(
          id,
          title,
          require_evaluation,
          evaluation_id
        )
      `)
      .eq('student_id', studentRecord.id)
      .eq('status', 'PRESENT')

    if (!attendanceError && attendanceRecords) {
      for (const attendance of attendanceRecords) {
        if (attendance.event?.require_evaluation && attendance.event.evaluation_id) {
          // Check if student has already submitted evaluation
          const { data: evalResponse } = await supabaseAdmin
            .from('form_responses')
            .select('id')
            .eq('form_id', attendance.event.evaluation_id)
            .eq('student_id', studentRecord.id)
            .single()

          if (!evalResponse) {
            // Check if unread notification already exists for this event
            const { data: existingNotifications } = await supabaseAdmin
              .from('notifications')
              .select('id')
              .eq('student_id', studentRecord.id)
              .eq('type', 'EVALUATION_REQUIRED')
              .eq('data->>event_id', attendance.event.id)
              .eq('is_read', false)

            // Only create if no unread notification exists for this event
            if (!existingNotifications || existingNotifications.length === 0) {
              // Create evaluation required notification
              const result = await createNotification({
                studentId: studentRecord.id,
                userId: studentRecord.user_id || undefined,
                type: 'EVALUATION_REQUIRED',
                title: `Evaluation Required: ${attendance.event.title}`,
                message: `You attended ${attendance.event.title} and need to complete the event evaluation to access your certificate.`,
                data: {
                  event_id: attendance.event.id,
                  event_title: attendance.event.title,
                  evaluation_url: `/dashboard/events/${attendance.event.id}/evaluation`
                }
              })

              if (result.success) {
                notificationsCreated.push('evaluation')
                console.log(`🔔 [NOTIFICATIONS CHECK] Created evaluation notification for event: ${attendance.event.title}`)
              }
            }
          }
        }
      }
    }

    // 2. Check for certificates ready to download but not downloaded yet
    console.log('🔔 [NOTIFICATIONS CHECK] Checking for ready certificates not downloaded...')
    
    // Get all accessible certificates for this student
    const { data: certificates, error: certError } = await supabaseAdmin
      .from('certificates')
      .select(`
        *,
        event:events(
          id,
          title
        )
      `)
      .eq('student_id', studentRecord.id)
      .eq('is_accessible', true)

    if (!certError && certificates) {
      for (const certificate of certificates) {
        // Check if certificate has been downloaded (check certificate_access_log)
        const { data: accessLog } = await supabaseAdmin
          .from('certificate_access_log')
          .select('id')
          .eq('certificate_id', certificate.id)
          .eq('access_type', 'DOWNLOAD')
          .limit(1)

        if (!accessLog || accessLog.length === 0) {
          // Certificate hasn't been downloaded yet
          // Check if unread notification already exists for this certificate
          const { data: existingNotifications } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('student_id', studentRecord.id)
            .eq('type', 'CERTIFICATE_READY')
            .eq('data->>certificate_id', certificate.id)
            .eq('is_read', false)

          // Only create if no unread notification exists for this certificate
          if (!existingNotifications || existingNotifications.length === 0) {
            // Create certificate ready notification
            const result = await createNotification({
              studentId: studentRecord.id,
              userId: studentRecord.user_id || undefined,
              type: 'CERTIFICATE_READY',
              title: `Certificate Ready: ${certificate.event?.title || 'Event'}`,
              message: `Your certificate of participation for ${certificate.event?.title || 'the event'} is now ready for download.${certificate.certificate_number ? ` Certificate #${certificate.certificate_number}` : ''}`,
              data: {
                event_id: certificate.event_id,
                certificate_id: certificate.id,
                certificate_url: `/dashboard/certificates/${certificate.id}`,
                event_title: certificate.event?.title || 'Event',
                certificate_number: certificate.certificate_number || ''
              }
            })

            if (result.success) {
              notificationsCreated.push('certificate')
              console.log(`🔔 [NOTIFICATIONS CHECK] Created certificate notification for: ${certificate.event?.title}`)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsCreated: notificationsCreated.length,
      types: notificationsCreated,
      message: `Checked and created ${notificationsCreated.length} notification(s)`
    })

  } catch (error) {
    console.error('🔔 [NOTIFICATIONS CHECK] Error checking pending notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

