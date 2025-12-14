/**
 * SMTP Email Provider Implementation
 * 
 * Fallback email provider using SMTP (via nodemailer)
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import {
  IEmailProvider,
  EmailProviderType,
  EmailPayload,
  EmailResponse,
  EmailError,
  EmailErrorType,
} from './types'

export class SmtpEmailProvider implements IEmailProvider {
  readonly providerType = EmailProviderType.SMTP
  private transporter: Transporter | null = null

  constructor() {
    if (this.isConfigured()) {
      this.initializeTransporter()
    }
  }

  isConfigured(): boolean {
    // Check for required SMTP configuration
    const hasHost = !!process.env.SMTP_HOST
    const hasUser = !!process.env.SMTP_USER
    const hasPass = !!process.env.SMTP_PASS
    
    // In development, allow ethereal fallback
    const isDev = process.env.NODE_ENV === 'development'
    
    return isDev || (hasHost && hasUser && hasPass)
  }

  private async initializeTransporter() {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      
      // For development without SMTP config, use Ethereal
      if (isDev && !process.env.SMTP_HOST) {
        console.log('[EMAIL_PROVIDER] Initializing Ethereal test account for development')
        const testAccount = await nodemailer.createTestAccount()
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        })
        
        console.log('[EMAIL_PROVIDER] Ethereal test account created:', testAccount.user)
        return
      }

      // Production SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Connection timeout settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
      })

      console.log(`[EMAIL_PROVIDER] SMTP transporter initialized: ${process.env.SMTP_HOST}`)
    } catch (error) {
      console.error('[EMAIL_PROVIDER] Failed to initialize SMTP transporter:', error)
      this.transporter = null
    }
  }

  async sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    const startTime = Date.now()
    
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'SMTP provider is not configured. Missing SMTP credentials.',
          provider: this.providerType,
          timestamp: new Date(),
        }
      }

      // Initialize transporter if not already done
      if (!this.transporter) {
        await this.initializeTransporter()
      }

      if (!this.transporter) {
        return {
          success: false,
          error: 'Failed to initialize SMTP transporter',
          provider: this.providerType,
          timestamp: new Date(),
        }
      }

      console.log(`[EMAIL_PROVIDER] Attempting to send via SMTP to: ${payload.to}`)

      // Convert to string if array (SMTP handles single recipient better)
      const toAddress = Array.isArray(payload.to) ? payload.to.join(',') : payload.to

      const result = await this.transporter.sendMail({
        from: payload.from || `"${process.env.SMTP_FROM_NAME || 'SmartU'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@smartu.edu'}>`,
        to: toAddress,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || '',
        replyTo: payload.replyTo,
      })

      const duration = Date.now() - startTime

      // Preview URL for development (Ethereal)
      if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
        const previewUrl = nodemailer.getTestMessageUrl(result)
        if (previewUrl) {
          console.log(`[EMAIL_PROVIDER] 📧 Ethereal Preview URL: ${previewUrl}`)
        }
      }

      console.log(`[EMAIL_PROVIDER] ✓ SMTP success (${duration}ms):`, result.messageId)

      return {
        success: true,
        messageId: result.messageId,
        provider: this.providerType,
        timestamp: new Date(),
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(`[EMAIL_PROVIDER] SMTP exception (${duration}ms):`, error)
      
      const emailError = this.parseError(error)
      
      return {
        success: false,
        error: emailError.message,
        provider: this.providerType,
        timestamp: new Date(),
      }
    }
  }

  parseError(error: any): EmailError {
    const errorMessage = error?.message || String(error)
    const errorString = errorMessage.toLowerCase()
    const errorCode = error?.code

    // Connection errors
    if (errorCode === 'ECONNREFUSED' || 
        errorCode === 'ENOTFOUND' ||
        errorCode === 'ETIMEDOUT' ||
        errorString.includes('connection refused') ||
        errorString.includes('could not connect')) {
      return {
        type: EmailErrorType.SMTP_CONNECTION_ERROR,
        message: 'Failed to connect to SMTP server',
        originalError: error,
        shouldFallback: false, // No fallback from SMTP - it's already the fallback
      }
    }

    // Authentication errors
    if (errorCode === 'EAUTH' ||
        errorString.includes('authentication failed') ||
        errorString.includes('invalid login') ||
        errorString.includes('username and password not accepted')) {
      return {
        type: EmailErrorType.SMTP_AUTH_ERROR,
        message: 'SMTP authentication failed - check credentials',
        originalError: error,
        shouldFallback: false,
      }
    }

    // Send errors
    if (errorString.includes('recipient rejected') ||
        errorString.includes('mailbox unavailable')) {
      return {
        type: EmailErrorType.SMTP_SEND_ERROR,
        message: 'SMTP send error - recipient may be invalid',
        originalError: error,
        shouldFallback: false,
      }
    }

    // Invalid email
    if (errorString.includes('invalid email') || 
        errorString.includes('invalid address')) {
      return {
        type: EmailErrorType.INVALID_EMAIL,
        message: 'Invalid email address provided',
        originalError: error,
        shouldFallback: false,
      }
    }

    // Unknown error
    return {
      type: EmailErrorType.UNKNOWN_ERROR,
      message: `SMTP error: ${errorMessage}`,
      originalError: error,
      shouldFallback: false,
    }
  }
}

