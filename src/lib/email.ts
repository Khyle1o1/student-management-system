import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Attendance Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">Attendance Confirmed</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Student Management System</p>
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
                <strong>Student Management System</strong><br>
                This email was sent automatically. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data: result, error } = await resend.emails.send({
      from: 'Student Management System <onboarding@resend.dev>',
      to: [data.studentEmail],
      subject,
      html,
    })

    if (error) {
      console.error('Error sending attendance confirmation email:', error)
      return { success: false, error: error.message }
    }

    console.log('Attendance confirmation email sent successfully:', result?.id)
    return { success: true, messageId: result?.id }

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
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Evaluation Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">Evaluation Required</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Student Management System</p>
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
                <strong>Student Management System</strong><br>
                This email was sent automatically. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data: result, error } = await resend.emails.send({
      from: 'Student Management System <onboarding@resend.dev>',
      to: [data.studentEmail],
      subject,
      html,
    })

    if (error) {
      console.error('Error sending evaluation reminder email:', error)
      return { success: false, error: error.message }
    }

    console.log('Evaluation reminder email sent successfully:', result?.id)
    return { success: true, messageId: result?.id }

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
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Certificate Available</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Certificate Ready!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Student Management System</p>
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
                <strong>Student Management System</strong><br>
                This email was sent automatically. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data: result, error } = await resend.emails.send({
      from: 'Student Management System <onboarding@resend.dev>',
      to: [data.studentEmail],
      subject,
      html,
    })

    if (error) {
      console.error('Error sending certificate available email:', error)
      return { success: false, error: error.message }
    }

    console.log('Certificate available email sent successfully:', result?.id)
    return { success: true, messageId: result?.id }

  } catch (error) {
    console.error('Error in sendCertificateAvailableEmail:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
} 