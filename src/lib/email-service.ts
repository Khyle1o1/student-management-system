import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
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

// Create reusable transporter
const createTransporter = async () => {
  // For development, use ethereal email
  // For production, configure with actual SMTP settings
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev && !process.env.SMTP_HOST) {
    // Create test account for development
    const testAccount = await nodemailer.createTestAccount()
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
  }

  // Production configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = await createTransporter()
    
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'SmartU'}" <${process.env.SMTP_FROM_EMAIL || options.to}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
    })

    // Preview URL for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
    }

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

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

// Email Template Generators
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

