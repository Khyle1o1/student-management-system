/**
 * Unified Email Service
 * 
 * This service provides backward-compatible email sending functions
 * while using the new dual provider system with automatic fallback.
 */

import { sendEmail as dispatchEmail, EmailPayload } from './email-providers'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface ReminderSettings {
  enabled: boolean
  senderEmail: string
  senderName: string
  replyTo: string
  eventReminder1Day: boolean
  eventReminder1Hour: boolean
  feeReminderOnAssignment: boolean
  feeReminder3Days: boolean
  certificateNotification: boolean
}

/**
 * Send email using the unified dispatcher with automatic fallback
 */
export async function sendEmail(options: EmailOptions): Promise<{ 
  success: boolean
  messageId?: string
  error?: string 
}> {
  try {
    const payload: EmailPayload = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    }

    const result = await dispatchEmail(payload)

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    }
  } catch (error: any) {
    console.error('Unified email service error:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    }
  }
}

// ============================================
// EVENT REMINDERS
// ============================================

export async function sendEventReminder(
  studentEmail: string,
  studentName: string,
  eventName: string,
  eventDate: string,
  eventTime: string,
  location: string,
  reminderType: '1day' | '1hour'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const timeText = reminderType === '1day' ? '1 day' : '1 hour'
  const subject = `Reminder: ${eventName} in ${timeText}`
  
  const html = generateEventReminderTemplate(
    studentName,
    eventName,
    eventDate,
    eventTime,
    location,
    timeText
  )

  return sendEmail({
    to: studentEmail,
    subject,
    html,
    text: `Hi ${studentName}, this is a reminder that ${eventName} is happening in ${timeText} on ${eventDate} at ${eventTime}. Location: ${location}`,
  })
}

// ============================================
// FEE REMINDERS
// ============================================

export async function sendFeeReminder(
  studentEmail: string,
  studentName: string,
  feeTitle: string,
  amount: number,
  dueDate: string,
  reminderType: 'assigned' | '3days'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = reminderType === 'assigned' 
    ? `New Fee Assigned: ${feeTitle}`
    : `Reminder: Fee Due in 3 Days - ${feeTitle}`
  
  const html = generateFeeReminderTemplate(
    studentName,
    feeTitle,
    amount,
    dueDate,
    reminderType
  )

  return sendEmail({
    to: studentEmail,
    subject,
    html,
    text: `Hi ${studentName}, ${reminderType === 'assigned' ? 'you have been assigned a new fee' : 'this is a reminder that your fee is due in 3 days'}: ${feeTitle} - Amount: ₱${amount} - Due: ${dueDate}`,
  })
}

// ============================================
// CERTIFICATE NOTIFICATIONS
// ============================================

export async function sendCertificateNotification(
  studentEmail: string,
  studentName: string,
  certificateName: string,
  downloadLink: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `Your Certificate is Ready: ${certificateName}`
  
  const html = generateCertificateNotificationTemplate(
    studentName,
    certificateName,
    downloadLink
  )

  return sendEmail({
    to: studentEmail,
    subject,
    html,
    text: `Hi ${studentName}, your certificate "${certificateName}" is now ready for download. Download it here: ${downloadLink}`,
  })
}

// ============================================
// ADMIN NOTIFICATIONS - FEE APPROVAL
// ============================================

export async function sendPendingFeeApprovalNotification(
  adminEmail: string,
  adminName: string,
  feeName: string,
  feeAmount: number,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `New Fee Pending Approval: ${feeName}`
  
  const html = generatePendingFeeApprovalTemplate(
    adminName,
    feeName,
    feeAmount,
    submittedBy,
    submitterRole,
    scopeType,
    scopeCollege,
    scopeCourse
  )

  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text: `Hi ${adminName}, a new fee "${feeName}" (₱${feeAmount}) has been submitted by ${submittedBy} (${submitterRole}) and is pending your approval. Please log in to review and approve.`,
  })
}

// ============================================
// ADMIN NOTIFICATIONS - EVENT APPROVAL
// ============================================

export async function sendPendingEventApprovalNotification(
  adminEmail: string,
  adminName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  location: string,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `New Event Pending Approval: ${eventTitle}`
  
  const html = generatePendingEventApprovalTemplate(
    adminName,
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

  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text: `Hi ${adminName}, a new event "${eventTitle}" has been submitted by ${submittedBy} (${submitterRole}) and is pending your approval. Event date: ${eventDate} at ${eventTime}. Please log in to review and approve.`,
  })
}

// ============================================
// ATTENDANCE & EVALUATION EMAILS
// ============================================

export interface AttendanceEmailData {
  studentName: string
  studentEmail: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  requiresEvaluation: boolean
  evaluationUrl?: string
  certificateUrl?: string
}

export async function sendAttendanceConfirmationEmail(data: AttendanceEmailData) {
  try {
    const subject = `Attendance Confirmed: ${data.eventTitle}`
    const html = generateAttendanceConfirmationTemplate(data)

    const result = await sendEmail({
      to: data.studentEmail,
      subject,
      html,
    })

    return result
  } catch (error) {
    console.error('Error in sendAttendanceConfirmationEmail:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export interface EvaluationReminderEmailData {
  studentName: string
  studentEmail: string
  eventTitle: string
  evaluationUrl: string
  daysRemaining?: number
}

export async function sendEvaluationReminderEmail(data: EvaluationReminderEmailData) {
  try {
    const subject = `Evaluation Required: ${data.eventTitle}`
    const html = generateEvaluationReminderTemplate(data)

    const result = await sendEmail({
      to: data.studentEmail,
      subject,
      html,
    })

    return result
  } catch (error) {
    console.error('Error in sendEvaluationReminderEmail:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export interface CertificateAvailableEmailData {
  studentName: string
  studentEmail: string
  eventTitle: string
  certificateUrl: string
  certificateNumber: string
}

export async function sendCertificateAvailableEmail(data: CertificateAvailableEmailData) {
  try {
    const subject = `Certificate Ready: ${data.eventTitle}`
    const html = generateCertificateAvailableTemplate(data)

    const result = await sendEmail({
      to: data.studentEmail,
      subject,
      html,
    })

    return result
  } catch (error) {
    console.error('Error in sendCertificateAvailableEmail:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// ============================================
// EMAIL TEMPLATE GENERATORS
// ============================================

function generateEventReminderTemplate(
  studentName: string,
  eventName: string,
  eventDate: string,
  eventTime: string,
  location: string,
  timeText: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #191970 0%, #0f1349 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SmartU</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px;">Smart Solutions for a Smarter BukSU</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #191970; margin: 0 0 20px 0; font-size: 22px;">Event Reminder</h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${studentName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                This is a reminder that <strong>${eventName}</strong> is happening in <strong>${timeText}</strong>.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="color: #191970; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">📅 Event Details:</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Event:</strong> ${eventName}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${eventDate}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Time:</strong> ${eventTime}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Location:</strong> ${location}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                Make sure to attend on time. We look forward to seeing you there!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                This is an automated reminder from SmartU.<br>
                Smart Solutions for a Smarter BukSU
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function generateFeeReminderTemplate(
  studentName: string,
  feeTitle: string,
  amount: number,
  dueDate: string,
  reminderType: 'assigned' | '3days'
): string {
  const isAssigned = reminderType === 'assigned'
  const title = isAssigned ? 'New Fee Assigned' : 'Fee Due Soon'
  const message = isAssigned 
    ? 'You have been assigned a new fee. Please review the details below:'
    : 'This is a reminder that your fee is due in 3 days. Please make your payment as soon as possible:'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #191970 0%, #0f1349 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SmartU</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px;">Smart Solutions for a Smarter BukSU</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #191970; margin: 0 0 20px 0; font-size: 22px;">${title}</h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${studentName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${message}
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 2px solid #ffc107;">
                <tr>
                  <td>
                    <p style="color: #191970; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">💰 Fee Details:</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Fee:</strong> ${feeTitle}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 18px;"><strong>Amount:</strong> <span style="color: #d32f2f;">₱${amount.toLocaleString()}</span></p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Due Date:</strong> ${dueDate}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                ${isAssigned ? 'Please log in to your account to view more details and make your payment.' : 'Avoid late fees by paying on time through your student portal.'}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                This is an automated reminder from SmartU.<br>
                Smart Solutions for a Smarter BukSU
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function generateCertificateNotificationTemplate(
  studentName: string,
  certificateName: string,
  downloadLink: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #191970 0%, #0f1349 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SmartU</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px;">Smart Solutions for a Smarter BukSU</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #191970; margin: 0 0 20px 0; font-size: 22px;">🎉 Your Certificate is Ready!</h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${studentName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Congratulations! Your certificate <strong>"${certificateName}"</strong> is now ready for download.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f5e9; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 2px solid #4caf50;">
                <tr>
                  <td align="center">
                    <p style="color: #191970; font-weight: bold; margin: 0 0 20px 0; font-size: 16px;">📜 ${certificateName}</p>
                    <a href="${downloadLink}" style="display: inline-block; background-color: #191970; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">Download Certificate</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                Click the button above to download your certificate. You can also access it anytime through your student dashboard.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                This is an automated notification from SmartU.<br>
                Smart Solutions for a Smarter BukSU
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// Import templates from the old email-service.ts for admin notifications
function generatePendingFeeApprovalTemplate(
  adminName: string,
  feeName: string,
  feeAmount: number,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): string {
  const scopeText = scopeType === 'UNIVERSITY_WIDE' 
    ? 'University-Wide' 
    : scopeType === 'COLLEGE_WIDE' 
    ? `College: ${scopeCollege}` 
    : `Course: ${scopeCourse} (${scopeCollege})`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Pending Approval</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #191970 0%, #0f1349 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SmartU</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px;">Smart Solutions for a Smarter BukSU</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #191970; margin: 0 0 20px 0; font-size: 22px;">⏳ New Fee Pending Approval</h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${adminName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                A new fee has been submitted and requires your approval before it can be activated in the system.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff8e1; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 2px solid #ffa726;">
                <tr>
                  <td>
                    <p style="color: #191970; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">📋 Fee Details:</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Fee Name:</strong> ${feeName}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 18px;"><strong>Amount:</strong> <span style="color: #d32f2f;">₱${feeAmount.toLocaleString()}</span></p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Scope:</strong> ${scopeText}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #ff6f00;">Pending Approval</span></p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="color: #191970; font-weight: bold; margin: 0 0 10px 0; font-size: 14px;">👤 Submitted By:</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;">${submittedBy}</p>
                    <p style="color: #666666; margin: 5px 0; font-size: 13px;">Role: ${submitterRole}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Please log in to your admin dashboard to review the fee details and approve or reject it.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/dashboard/fees" style="display: inline-block; background-color: #191970; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 6px; font-weight: bold; font-size: 16px;">Review Fee</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <strong>Note:</strong> This fee will remain in pending status and will not be assigned to students until you approve it. Notifications will remain visible in your dashboard until action is taken.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                This is an automated notification from SmartU.<br>
                Smart Solutions for a Smarter BukSU
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function generatePendingEventApprovalTemplate(
  adminName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  location: string,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): string {
  const scopeText = scopeType === 'UNIVERSITY_WIDE' 
    ? 'University-Wide' 
    : scopeType === 'COLLEGE_WIDE' 
    ? `College: ${scopeCollege}` 
    : `Course: ${scopeCourse} (${scopeCollege})`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Pending Approval</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #191970 0%, #0f1349 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SmartU</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px;">Smart Solutions for a Smarter BukSU</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #191970; margin: 0 0 20px 0; font-size: 22px;">⏳ New Event Pending Approval</h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${adminName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                A new event has been submitted and requires your approval before it can be activated in the system.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f5e9; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 2px solid #4caf50;">
                <tr>
                  <td>
                    <p style="color: #191970; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">📅 Event Details:</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Event:</strong> ${eventTitle}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${eventDate}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Time:</strong> ${eventTime}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Location:</strong> ${location}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Scope:</strong> ${scopeText}</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #ff6f00;">Pending Approval</span></p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="color: #191970; font-weight: bold; margin: 0 0 10px 0; font-size: 14px;">👤 Submitted By:</p>
                    <p style="color: #333333; margin: 5px 0; font-size: 14px;">${submittedBy}</p>
                    <p style="color: #666666; margin: 5px 0; font-size: 13px;">Role: ${submitterRole}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Please log in to your admin dashboard to review the event details and approve or reject it.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/dashboard/events" style="display: inline-block; background-color: #191970; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 6px; font-weight: bold; font-size: 16px;">Review Event</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <strong>Note:</strong> This event will remain in pending status until you approve it. Notifications will remain visible in your dashboard until action is taken.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                This is an automated notification from SmartU.<br>
                Smart Solutions for a Smarter BukSU
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function generateAttendanceConfirmationTemplate(data: AttendanceEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Attendance Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">Attendance Confirmed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">SmartU</p>
        </div>
        
        <div style="padding: 0 20px;">
          <p style="font-size: 18px; color: #2c5aa0;">Hello ${data.studentName},</p>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Your attendance has been successfully recorded for the following event:
          </p>
          
          <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #2c5aa0;">${data.eventTitle}</h3>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${data.eventDate}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${data.eventLocation}</p>
          </div>
          
          ${data.requiresEvaluation ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #856404;">📝 Evaluation Required</h4>
              <p style="margin: 10px 0;">
                To access your certificate of participation, please complete the event evaluation.
              </p>
              ${data.evaluationUrl ? `
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${data.evaluationUrl}" 
                     style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Complete Evaluation
                  </a>
                </div>
              ` : ''}
              <p style="color: #856404; font-size: 14px; margin: 10px 0 0 0;">
                Your certificate will be available once the evaluation is submitted.
              </p>
            </div>
          ` : ''}
          
          ${!data.requiresEvaluation && data.certificateUrl ? `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #155724;">🎉 Certificate Available</h4>
              <p style="margin: 10px 0;">
                Your certificate of participation is now available for download.
              </p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${data.certificateUrl}" 
                   style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Download Certificate
                </a>
              </div>
            </div>
          ` : ''}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p style="margin: 10px 0;">
              If you have any questions about this event or your attendance record, please contact your administrator.
            </p>
            <p style="margin: 10px 0;">
              <strong>SmartU</strong><br>
              This email was sent automatically. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

function generateEvaluationReminderTemplate(data: EvaluationReminderEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Evaluation Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">Evaluation Required</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">SmartU</p>
        </div>
        
        <div style="padding: 0 20px;">
          <p style="font-size: 18px; color: #2c5aa0;">Hello ${data.studentName},</p>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            You have attended <strong>${data.eventTitle}</strong> and need to complete the event evaluation to access your certificate.
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <h3 style="margin: 0 0 15px 0; color: #856404;">📝 Complete Your Evaluation</h3>
            <p style="margin: 15px 0;">
              Your feedback is important to us and helps improve future events.
            </p>
            <div style="margin: 25px 0;">
              <a href="${data.evaluationUrl}" 
                 style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                Complete Evaluation Now
              </a>
            </div>
            ${data.daysRemaining ? `
              <p style="color: #856404; font-size: 14px; margin: 15px 0 0 0;">
                ⏰ You have ${data.daysRemaining} days remaining to complete this evaluation.
              </p>
            ` : ''}
          </div>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h4 style="margin: 0 0 15px 0; color: #0c5460;">📄 Certificate Waiting</h4>
            <p style="margin: 10px 0; color: #0c5460;">
              Your certificate of participation will be available for download immediately after you submit the evaluation.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p style="margin: 10px 0;">
              If you're having trouble accessing the evaluation or have questions, please contact your administrator.
            </p>
            <p style="margin: 10px 0;">
              <strong>SmartU</strong><br>
              This email was sent automatically. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

function generateCertificateAvailableTemplate(data: CertificateAvailableEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Certificate Available</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Certificate Ready!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">SmartU</p>
        </div>
        
        <div style="padding: 0 20px;">
          <p style="font-size: 18px; color: #2c5aa0;">Congratulations ${data.studentName}!</p>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Your certificate of participation for <strong>${data.eventTitle}</strong> is now ready for download.
          </p>
          
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 30px; margin: 25px 0; text-align: center;">
            <h3 style="margin: 0 0 20px 0; color: #155724;">📜 Your Certificate is Ready</h3>
            <p style="margin: 15px 0; font-size: 14px; color: #155724;">
              Certificate Number: <strong>${data.certificateNumber}</strong>
            </p>
            <div style="margin: 25px 0;">
              <a href="${data.certificateUrl}?action=download" 
                 style="background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                Download Certificate
              </a>
            </div>
            <p style="color: #155724; font-size: 13px; margin: 15px 0 0 0;">
              You can also view your certificate online before downloading.
            </p>
          </div>
          
          <div style="background: #f8f9fa; border-left: 4px solid #17a2b8; padding: 20px; margin: 25px 0;">
            <h4 style="margin: 0 0 15px 0; color: #17a2b8;">💡 Keep Your Certificate Safe</h4>
            <ul style="margin: 10px 0; padding-left: 20px; color: #495057;">
              <li>Save a digital copy to your computer</li>
              <li>Consider printing a physical copy</li>
              <li>You can download it again anytime from your student dashboard</li>
            </ul>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p style="margin: 10px 0;">
              Thank you for participating in ${data.eventTitle}. We hope you found it valuable!
            </p>
            <p style="margin: 10px 0;">
              <strong>SmartU</strong><br>
              This email was sent automatically. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

