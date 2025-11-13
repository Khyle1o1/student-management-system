import { supabase } from './supabase'
import { sendFeeReminder, sendCertificateNotification } from './email-service'

interface NotificationSettings {
  enabled: boolean
  fee_reminder_on_assignment: boolean
  certificate_notification: boolean
}

// Get notification settings
async function getNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('enabled, fee_reminder_on_assignment, certificate_notification')
      .single()

    if (error) {
      console.error('Error fetching notification settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getNotificationSettings:', error)
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
    await supabase.from('notification_logs').insert({
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
    const { data: student, error: studentError } = await supabase
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
    const { data: student, error: studentError } = await supabase
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

