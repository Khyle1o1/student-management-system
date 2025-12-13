import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-admin'
import { sendFeeReminder, sendCertificateNotification, sendPendingFeeApprovalNotification, sendPendingEventApprovalNotification } from './email-service'

interface NotificationSettings {
  enabled: boolean
  fee_reminder_on_assignment: boolean
  certificate_notification: boolean
}

// Get notification settings
async function getNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    console.log('🔔 [NOTIFICATION SETTINGS] Fetching notification settings...')
    
    // Use supabaseAdmin to bypass RLS and get first row only
    const { data, error } = await supabaseAdmin
      .from('notification_settings')
      .select('enabled, fee_reminder_on_assignment, certificate_notification')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ [NOTIFICATION SETTINGS] Error fetching:', error)
      return null
    }

    if (!data) {
      console.error('❌ [NOTIFICATION SETTINGS] No settings found in database')
      return null
    }

    console.log('✅ [NOTIFICATION SETTINGS] Settings loaded:', {
      enabled: data.enabled,
      fee_reminder_on_assignment: data.fee_reminder_on_assignment,
      certificate_notification: data.certificate_notification
    })

    return data
  } catch (error) {
    console.error('❌ [NOTIFICATION SETTINGS] Exception:', error)
    return null
  }
}

// Log notification attempt
async function logNotification(data: {
  recipient_email: string
  recipient_name: string
  subject: string
  notification_type: string
  status: 'sent' | 'failed'
  message_id?: string
  error_message?: string
  event_id?: string
  fee_id?: string
  certificate_id?: string
  student_id?: string
}) {
  try {
    // Use supabaseAdmin to bypass RLS
    await supabaseAdmin.from('notification_logs').insert({
      ...data,
      sent_at: data.status === 'sent' ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error('Error logging notification:', error)
  }
}

/**
 * Send fee assignment notification to a student
 * Call this function when assigning a fee to a student
 * 
 * @example
 * ```typescript
 * await notifyFeeAssigned(
 *   studentId,
 *   feeId,
 *   'Tuition Fee',
 *   5000,
 *   '2024-12-31'
 * )
 * ```
 */
export async function notifyFeeAssigned(
  studentId: string,
  feeId: string,
  feeTitle: string,
  amount: number,
  dueDate: string
): Promise<void> {
  try {
    // Check if notifications are enabled
    const settings = await getNotificationSettings()
    if (!settings?.enabled || !settings?.fee_reminder_on_assignment) {
      console.log('Fee assignment notifications are disabled')
      return
    }

    // Get student details
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, email')
      .eq('id', studentId)
      .single()

    if (studentError || !student?.email) {
      console.error('Student not found or has no email:', studentError)
      return
    }

    // Send email
    const result = await sendFeeReminder(
      student.email,
      student.full_name,
      feeTitle,
      amount,
      new Date(dueDate).toLocaleDateString(),
      'assigned'
    )

    // Log notification
    await logNotification({
      recipient_email: student.email,
      recipient_name: student.full_name,
      subject: `New Fee Assigned: ${feeTitle}`,
      notification_type: 'fee_assigned',
      status: result.success ? 'sent' : 'failed',
      message_id: result.messageId,
      error_message: result.error,
      fee_id: feeId,
      student_id: studentId,
    })

    if (result.success) {
      console.log(`Fee assignment notification sent to ${student.email}`)
    } else {
      console.error(`Failed to send fee notification: ${result.error}`)
    }
  } catch (error) {
    console.error('Error in notifyFeeAssigned:', error)
  }
}

/**
 * Send certificate ready notification to a student
 * Call this function when a certificate becomes available for download
 * 
 * @example
 * ```typescript
 * await notifyCertificateReady(
 *   studentId,
 *   certificateId,
 *   'Certificate of Completion',
 *   'https://your-domain.com/certificates/download/123'
 * )
 * ```
 */
export async function notifyCertificateReady(
  studentId: string,
  certificateId: string,
  certificateName: string,
  downloadLink: string
): Promise<void> {
  try {
    // Check if notifications are enabled
    const settings = await getNotificationSettings()
    if (!settings?.enabled || !settings?.certificate_notification) {
      console.log('Certificate notifications are disabled')
      return
    }

    // Get student details
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, email')
      .eq('id', studentId)
      .single()

    if (studentError || !student?.email) {
      console.error('Student not found or has no email:', studentError)
      return
    }

    // Send email
    const result = await sendCertificateNotification(
      student.email,
      student.full_name,
      certificateName,
      downloadLink
    )

    // Log notification
    await logNotification({
      recipient_email: student.email,
      recipient_name: student.full_name,
      subject: `Your Certificate is Ready: ${certificateName}`,
      notification_type: 'certificate',
      status: result.success ? 'sent' : 'failed',
      message_id: result.messageId,
      error_message: result.error,
      certificate_id: certificateId,
      student_id: studentId,
    })

    if (result.success) {
      console.log(`Certificate notification sent to ${student.email}`)
    } else {
      console.error(`Failed to send certificate notification: ${result.error}`)
    }
  } catch (error) {
    console.error('Error in notifyCertificateReady:', error)
  }
}

/**
 * Send fee assignment notifications to multiple students
 * Useful for batch fee assignments
 * 
 * @example
 * ```typescript
 * await notifyBatchFeeAssigned(
 *   ['student-id-1', 'student-id-2'],
 *   'fee-id',
 *   'Tuition Fee',
 *   5000,
 *   '2024-12-31'
 * )
 * ```
 */
export async function notifyBatchFeeAssigned(
  studentIds: string[],
  feeId: string,
  feeTitle: string,
  amount: number,
  dueDate: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const studentId of studentIds) {
    try {
      await notifyFeeAssigned(studentId, feeId, feeTitle, amount, dueDate)
      sent++
    } catch (error) {
      console.error(`Failed to notify student ${studentId}:`, error)
      failed++
    }
  }

  console.log(`Batch fee notifications: ${sent} sent, ${failed} failed`)
  return { sent, failed }
}

/**
 * Example: Integrate with fee creation
 * Add this to your fee creation/assignment API route
 */
export async function exampleFeeIntegration() {
  // After creating/assigning a fee in your API route:
  /*
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      student_id: studentId,
      fee_id: feeId,
      amount: amount,
      due_date: dueDate,
      status: 'UNPAID'
    })
    .select()
    .single()

  if (!error && payment) {
    // Send notification
    await notifyFeeAssigned(
      studentId,
      feeId,
      feeTitle,
      amount,
      dueDate
    )
  }
  */
}

/**
 * Example: Integrate with certificate generation
 * Add this to your certificate generation code
 */
export async function exampleCertificateIntegration() {
  // After generating/approving a certificate:
  /*
  const { data: certificate, error } = await supabase
    .from('certificates')
    .insert({
      student_id: studentId,
      certificate_name: certificateName,
      status: 'ready',
      file_url: downloadUrl
    })
    .select()
    .single()

  if (!error && certificate) {
    // Send notification
    await notifyCertificateReady(
      studentId,
      certificate.id,
      certificateName,
      `${process.env.NEXT_PUBLIC_APP_URL}/certificates/download/${certificate.id}`
    )
  }
  */
}

/**
 * Send pending fee approval notification to all admins
 * Call this function when a College Org or SSC creates a fee in pending status
 * 
 * @example
 * ```typescript
 * await notifyAdminsPendingFee(
 *   'fee-id',
 *   'Tuition Fee',
 *   5000,
 *   'John Doe',
 *   'COLLEGE_ORG',
 *   'COLLEGE_WIDE',
 *   'College of Technologies',
 *   undefined
 * )
 * ```
 */
export async function notifyAdminsPendingFee(
  feeId: string,
  feeName: string,
  feeAmount: number,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  try {
    console.log('📧 [ADMIN NOTIFICATION] Starting fee approval notification process...')
    console.log('📧 [ADMIN NOTIFICATION] Fee details:', {
      feeId,
      feeName,
      feeAmount,
      submittedBy,
      submitterRole,
      scopeType
    })

    // Check if notifications are enabled
    const settings = await getNotificationSettings()
    
    if (!settings) {
      console.error('❌ [ADMIN NOTIFICATION] Could not load notification settings')
      return { sent: 0, failed: 0 }
    }

    console.log('📧 [ADMIN NOTIFICATION] Settings check:', {
      enabled: settings.enabled,
      fee_reminder_on_assignment: settings.fee_reminder_on_assignment
    })

    if (!settings?.enabled) {
      console.log('❌ [ADMIN NOTIFICATION] Notifications are disabled globally')
      return { sent: 0, failed: 0 }
    }

    console.log('✅ [ADMIN NOTIFICATION] Notifications are enabled, fetching admin users...')

    // Get all admin and super admin users
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('role', 'ADMIN')
      .not('email', 'is', null)

    if (adminsError || !admins || admins.length === 0) {
      console.error('❌ [ADMIN NOTIFICATION] No admin users found or error fetching admins:', adminsError)
      return { sent: 0, failed: 0 }
    }

    console.log(`✅ [ADMIN NOTIFICATION] Found ${admins.length} admin(s) to notify:`, admins.map(a => a.email))

    // Send email to each admin
    for (const admin of admins) {
      try {
        console.log(`📧 [ADMIN NOTIFICATION] Sending email to: ${admin.email}`)
        
        const result = await sendPendingFeeApprovalNotification(
          admin.email,
          admin.name || 'Admin',
          feeName,
          feeAmount,
          submittedBy,
          submitterRole,
          scopeType,
          scopeCollege,
          scopeCourse
        )

        console.log(`📧 [ADMIN NOTIFICATION] Email result for ${admin.email}:`, {
          success: result.success,
          messageId: result.messageId,
          error: result.error
        })

        // Log notification
        await logNotification({
          recipient_email: admin.email,
          recipient_name: admin.name || 'Admin',
          subject: `New Fee Pending Approval: ${feeName}`,
          notification_type: 'fee_pending_approval',
          status: result.success ? 'sent' : 'failed',
          message_id: result.messageId,
          error_message: result.error,
          fee_id: feeId,
        })

        if (result.success) {
          console.log(`✅ [ADMIN NOTIFICATION] Successfully sent to: ${admin.email}`)
          sent++
        } else {
          console.error(`❌ [ADMIN NOTIFICATION] Failed to send to ${admin.email}: ${result.error}`)
          failed++
        }
      } catch (error) {
        console.error(`❌ [ADMIN NOTIFICATION] Exception sending to ${admin.email}:`, error)
        failed++
      }
    }

    console.log(`📊 [ADMIN NOTIFICATION] Final results: ${sent} sent, ${failed} failed`)
    return { sent, failed }
  } catch (error) {
    console.error('❌ [ADMIN NOTIFICATION] Fatal error in notifyAdminsPendingFee:', error)
    return { sent, failed }
  }
}

/**
 * Send pending event approval notification to all admins
 * Call this function when a College Org or Course Org creates an event in pending status
 * 
 * @example
 * ```typescript
 * await notifyAdminsPendingEvent(
 *   'event-id',
 *   'Annual Seminar',
 *   '2025-12-25',
 *   '9:00 AM - 5:00 PM',
 *   'University Auditorium',
 *   'John Doe',
 *   'College Organization',
 *   'COLLEGE_WIDE',
 *   'College of Technologies'
 * )
 * ```
 */
export async function notifyAdminsPendingEvent(
  eventId: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  location: string,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  try {
    console.log('📧 [EVENT NOTIFICATION] Starting event approval notification process...')
    console.log('📧 [EVENT NOTIFICATION] Event details:', {
      eventId,
      eventTitle,
      eventDate,
      eventTime,
      location,
      submittedBy,
      submitterRole,
      scopeType
    })

    // Check if notifications are enabled
    const settings = await getNotificationSettings()
    
    if (!settings) {
      console.error('❌ [EVENT NOTIFICATION] Could not load notification settings')
      return { sent: 0, failed: 0 }
    }

    console.log('📧 [EVENT NOTIFICATION] Settings check:', {
      enabled: settings.enabled
    })

    if (!settings?.enabled) {
      console.log('❌ [EVENT NOTIFICATION] Notifications are disabled globally')
      return { sent: 0, failed: 0 }
    }

    console.log('✅ [EVENT NOTIFICATION] Notifications are enabled, fetching admin users...')

    // Get all admin users
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('role', 'ADMIN')
      .not('email', 'is', null)

    if (adminsError || !admins || admins.length === 0) {
      console.error('❌ [EVENT NOTIFICATION] No admin users found or error fetching admins:', adminsError)
      return { sent: 0, failed: 0 }
    }

    console.log(`✅ [EVENT NOTIFICATION] Found ${admins.length} admin(s) to notify:`, admins.map(a => a.email))

    // Send email to each admin
    for (const admin of admins) {
      try {
        console.log(`📧 [EVENT NOTIFICATION] Sending email to: ${admin.email}`)
        
        const result = await sendPendingEventApprovalNotification(
          admin.email,
          admin.name || 'Admin',
          eventTitle,
          eventDate,
          eventTime,
          location,
          submittedBy,
          submitterRole,
          scopeType,
          scopeCollege,
          scopeCourse
        )

        console.log(`📧 [EVENT NOTIFICATION] Email result for ${admin.email}:`, {
          success: result.success,
          messageId: result.messageId,
          error: result.error
        })

        // Log notification
        await logNotification({
          recipient_email: admin.email,
          recipient_name: admin.name || 'Admin',
          subject: `New Event Pending Approval: ${eventTitle}`,
          notification_type: 'event_pending_approval',
          status: result.success ? 'sent' : 'failed',
          message_id: result.messageId,
          error_message: result.error,
          event_id: eventId,
        })

        if (result.success) {
          console.log(`✅ [EVENT NOTIFICATION] Successfully sent to: ${admin.email}`)
          sent++
        } else {
          console.error(`❌ [EVENT NOTIFICATION] Failed to send to ${admin.email}: ${result.error}`)
          failed++
        }
      } catch (error) {
        console.error(`❌ [EVENT NOTIFICATION] Exception sending to ${admin.email}:`, error)
        failed++
      }
    }

    console.log(`📊 [EVENT NOTIFICATION] Final results: ${sent} sent, ${failed} failed`)
    return { sent, failed }
  } catch (error) {
    console.error('❌ [EVENT NOTIFICATION] Fatal error in notifyAdminsPendingEvent:', error)
    return { sent, failed }
  }
}

