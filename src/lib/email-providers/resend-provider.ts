/**
 * Resend Email Provider Implementation
 * 
 * Primary email provider using Resend API
 */

import { Resend } from 'resend'
import {
  IEmailProvider,
  EmailProviderType,
  EmailPayload,
  EmailResponse,
  EmailError,
  EmailErrorType,
} from './types'

export class ResendEmailProvider implements IEmailProvider {
  readonly providerType = EmailProviderType.RESEND
  private resend: Resend | null = null
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY
    if (this.isConfigured()) {
      this.resend = new Resend(this.apiKey)
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0
  }

  async sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    const startTime = Date.now()
    
    try {
      if (!this.isConfigured() || !this.resend) {
        return {
          success: false,
          error: 'Resend provider is not configured. Missing RESEND_API_KEY.',
          provider: this.providerType,
          timestamp: new Date(),
        }
      }

      console.log(`[EMAIL_PROVIDER] Attempting to send via Resend to: ${payload.to}`)

      // Convert to array if string
      const toArray = Array.isArray(payload.to) ? payload.to : [payload.to]

      // Use verified domain email from environment variable
      let defaultFrom = 'SmartU <onboarding@resend.dev>' // Fallback to testing
      
      if (process.env.RESEND_FROM_EMAIL) {
        // Use RESEND_FROM_EMAIL if set
        defaultFrom = process.env.RESEND_FROM_EMAIL
        console.log(`[EMAIL_PROVIDER] Using RESEND_FROM_EMAIL: ${defaultFrom}`)
      } else if (process.env.SMTP_FROM_EMAIL) {
        // Otherwise construct from SMTP variables
        const name = process.env.SMTP_FROM_NAME || 'SmartU'
        const email = process.env.SMTP_FROM_EMAIL
        defaultFrom = `${name} <${email}>`
        console.log(`[EMAIL_PROVIDER] Constructed from SMTP vars: ${defaultFrom}`)
      } else {
        console.log(`[EMAIL_PROVIDER] Using default testing email: ${defaultFrom}`)
      }
      
      const fromAddress = payload.from || defaultFrom
      console.log(`[EMAIL_PROVIDER] Final 'from' address being used: ${fromAddress}`)
      
      const result = await this.resend.emails.send({
        from: fromAddress,
        to: toArray,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo,
      })

      const duration = Date.now() - startTime

      if (result.error) {
        console.error(`[EMAIL_PROVIDER] Resend failed (${duration}ms):`, result.error)
        const emailError = this.parseError(result.error)
        
        return {
          success: false,
          error: emailError.message,
          provider: this.providerType,
          timestamp: new Date(),
        }
      }

      console.log(`[EMAIL_PROVIDER] ✓ Resend success (${duration}ms):`, result.data?.id)

      return {
        success: true,
        messageId: result.data?.id,
        provider: this.providerType,
        timestamp: new Date(),
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(`[EMAIL_PROVIDER] Resend exception (${duration}ms):`, error)
      
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

    // Check for quota exceeded
    if (errorString.includes('quota') || 
        errorString.includes('limit exceeded') ||
        errorString.includes('free tier')) {
      return {
        type: EmailErrorType.QUOTA_EXCEEDED,
        message: 'Resend quota exceeded or free-tier limit reached',
        originalError: error,
        shouldFallback: true,
      }
    }

    // Check for rate limiting
    if (errorString.includes('rate limit') || 
        errorString.includes('too many requests') ||
        error?.statusCode === 429) {
      return {
        type: EmailErrorType.RATE_LIMIT,
        message: 'Resend rate limit exceeded',
        originalError: error,
        shouldFallback: true,
      }
    }

    // Check for network timeout
    if (errorString.includes('timeout') || 
        errorString.includes('etimedout') ||
        errorString.includes('econnrefused')) {
      return {
        type: EmailErrorType.NETWORK_TIMEOUT,
        message: 'Network timeout while connecting to Resend',
        originalError: error,
        shouldFallback: true,
      }
    }

    // Check for authentication errors
    if (errorString.includes('unauthorized') || 
        errorString.includes('invalid api key') ||
        error?.statusCode === 401 ||
        error?.statusCode === 403) {
      return {
        type: EmailErrorType.AUTHENTICATION_ERROR,
        message: 'Resend authentication failed - check API key',
        originalError: error,
        shouldFallback: true,
      }
    }

    // Check for API errors (5xx)
    if (error?.statusCode && error.statusCode >= 500) {
      return {
        type: EmailErrorType.API_ERROR,
        message: `Resend API error: ${error.statusCode}`,
        originalError: error,
        shouldFallback: true,
      }
    }

    // Check for invalid email or validation errors
    if (errorString.includes('invalid email') || 
        errorString.includes('invalid recipient')) {
      return {
        type: EmailErrorType.INVALID_EMAIL,
        message: 'Invalid email address provided',
        originalError: error,
        shouldFallback: false, // Don't fallback for invalid data
      }
    }

    // Check for validation errors (especially 'from' field issues)
    if (errorString.includes('validation_error') || 
        errorString.includes('invalid `from` field') ||
        error?.name === 'validation_error') {
      return {
        type: EmailErrorType.AUTHENTICATION_ERROR,
        message: 'Resend validation error - likely domain or from address issue',
        originalError: error,
        shouldFallback: true, // Fallback to SMTP for validation errors
      }
    }

    // Unknown error - still fallback to be safe
    return {
      type: EmailErrorType.UNKNOWN_ERROR,
      message: `Resend error: ${errorMessage}`,
      originalError: error,
      shouldFallback: true,
    }
  }
}

