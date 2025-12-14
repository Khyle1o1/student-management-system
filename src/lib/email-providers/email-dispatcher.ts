/**
 * Email Dispatcher with Automatic Fallback
 * 
 * Centralized email dispatcher that manages multiple providers with automatic
 * fallback from Resend (primary) to SMTP (secondary) on failure.
 */

import {
  IEmailProvider,
  EmailPayload,
  EmailResponse,
  EmailProviderType,
  EmailLog,
} from './types'
import { ResendEmailProvider } from './resend-provider'
import { SmtpEmailProvider } from './smtp-provider'
import { EmailLogger } from './email-logger'

export class EmailDispatcher {
  private primaryProvider: IEmailProvider
  private fallbackProvider: IEmailProvider
  private logger: EmailLogger
  private enableFallback: boolean

  constructor(enableFallback: boolean = true) {
    // Initialize providers
    this.primaryProvider = new ResendEmailProvider()
    this.fallbackProvider = new SmtpEmailProvider()
    this.logger = new EmailLogger()
    this.enableFallback = enableFallback

    // Log initialization
    this.logInitialization()
  }

  private logInitialization() {
    const primaryConfigured = this.primaryProvider.isConfigured()
    const fallbackConfigured = this.fallbackProvider.isConfigured()

    console.log('[EMAIL_DISPATCHER] Initializing Email Dispatcher')
    console.log(`[EMAIL_DISPATCHER] Primary (Resend): ${primaryConfigured ? '✓ Configured' : '✗ Not configured'}`)
    console.log(`[EMAIL_DISPATCHER] Fallback (SMTP): ${fallbackConfigured ? '✓ Configured' : '✗ Not configured'}`)
    console.log(`[EMAIL_DISPATCHER] Automatic Fallback: ${this.enableFallback ? 'ENABLED' : 'DISABLED'}`)

    if (!primaryConfigured && !fallbackConfigured) {
      console.warn('[EMAIL_DISPATCHER] ⚠️  WARNING: No email providers are configured!')
    } else if (!primaryConfigured) {
      console.warn('[EMAIL_DISPATCHER] ⚠️  Primary provider not configured, will use fallback only')
    } else if (!fallbackConfigured) {
      console.warn('[EMAIL_DISPATCHER] ⚠️  Fallback provider not configured, no redundancy available')
    }
  }

  /**
   * Send email with automatic fallback
   * 
   * Flow:
   * 1. Try primary provider (Resend)
   * 2. If primary fails with fallback-eligible error, try secondary (SMTP)
   * 3. Log the entire process
   * 4. Return result
   */
  async sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    const attemptedProviders: EmailProviderType[] = []
    let finalResponse: EmailResponse
    let fallbackUsed = false

    // Normalize recipient for logging
    const recipient = Array.isArray(payload.to) ? payload.to[0] : payload.to

    console.log(`\n[EMAIL_DISPATCHER] ========================================`)
    console.log(`[EMAIL_DISPATCHER] New email request`)
    console.log(`[EMAIL_DISPATCHER] To: ${recipient}`)
    console.log(`[EMAIL_DISPATCHER] Subject: ${payload.subject}`)
    console.log(`[EMAIL_DISPATCHER] ========================================`)

    // ========================================
    // STEP 1: Try Primary Provider (Resend)
    // ========================================
    if (this.primaryProvider.isConfigured()) {
      console.log(`[EMAIL_DISPATCHER] Attempting with PRIMARY provider: ${this.primaryProvider.providerType}`)
      attemptedProviders.push(this.primaryProvider.providerType)

      const primaryResult = await this.primaryProvider.sendEmail(payload)

      if (primaryResult.success) {
        console.log(`[EMAIL_DISPATCHER] ✓ SUCCESS with primary provider`)
        finalResponse = primaryResult
        
        // Log success
        await this.logger.logEmail({
          to: recipient,
          subject: payload.subject,
          provider: this.primaryProvider.providerType,
          success: true,
          messageId: primaryResult.messageId,
          attemptedProviders,
          timestamp: new Date(),
          fallbackUsed: false,
        })

        return finalResponse
      }

      // Primary failed
      console.log(`[EMAIL_DISPATCHER] ✗ FAILED with primary provider: ${primaryResult.error}`)

      // Check if we should fallback
      const shouldFallback = this.shouldAttemptFallback(primaryResult)

      if (!shouldFallback || !this.enableFallback) {
        console.log(`[EMAIL_DISPATCHER] Fallback not eligible or disabled. Returning failure.`)
        
        finalResponse = primaryResult

        // Log failure without fallback
        await this.logger.logEmail({
          to: recipient,
          subject: payload.subject,
          provider: this.primaryProvider.providerType,
          success: false,
          error: primaryResult.error,
          attemptedProviders,
          timestamp: new Date(),
          fallbackUsed: false,
        })

        return finalResponse
      }

      console.log(`[EMAIL_DISPATCHER] Fallback eligible. Attempting secondary provider...`)
    } else {
      console.log(`[EMAIL_DISPATCHER] ⚠️  Primary provider not configured, skipping to fallback`)
    }

    // ========================================
    // STEP 2: Try Fallback Provider (SMTP)
    // ========================================
    if (this.fallbackProvider.isConfigured()) {
      console.log(`[EMAIL_DISPATCHER] Attempting with FALLBACK provider: ${this.fallbackProvider.providerType}`)
      attemptedProviders.push(this.fallbackProvider.providerType)
      fallbackUsed = true

      const fallbackResult = await this.fallbackProvider.sendEmail(payload)

      if (fallbackResult.success) {
        console.log(`[EMAIL_DISPATCHER] ✓ SUCCESS with fallback provider`)
        finalResponse = fallbackResult

        // Log success with fallback
        await this.logger.logEmail({
          to: recipient,
          subject: payload.subject,
          provider: this.fallbackProvider.providerType,
          success: true,
          messageId: fallbackResult.messageId,
          attemptedProviders,
          timestamp: new Date(),
          fallbackUsed: true,
        })

        return finalResponse
      }

      // Fallback also failed
      console.log(`[EMAIL_DISPATCHER] ✗ FAILED with fallback provider: ${fallbackResult.error}`)
      finalResponse = fallbackResult

      // Log failure after fallback attempt
      await this.logger.logEmail({
        to: recipient,
        subject: payload.subject,
        provider: this.fallbackProvider.providerType,
        success: false,
        error: fallbackResult.error,
        attemptedProviders,
        timestamp: new Date(),
        fallbackUsed: true,
      })

      return finalResponse
    }

    // ========================================
    // STEP 3: Both providers failed or unconfigured
    // ========================================
    console.log(`[EMAIL_DISPATCHER] ✗ ALL PROVIDERS FAILED OR UNCONFIGURED`)

    finalResponse = {
      success: false,
      error: 'All email providers failed or are not configured',
      provider: EmailProviderType.SMTP,
      timestamp: new Date(),
    }

    // Log complete failure
    await this.logger.logEmail({
      to: recipient,
      subject: payload.subject,
      provider: EmailProviderType.SMTP,
      success: false,
      error: finalResponse.error,
      attemptedProviders,
      timestamp: new Date(),
      fallbackUsed,
    })

    return finalResponse
  }

  /**
   * Determine if we should attempt fallback based on the error
   */
  private shouldAttemptFallback(response: EmailResponse): boolean {
    if (!response.error) return false

    const errorMessage = response.error.toLowerCase()

    // Errors that should trigger fallback
    const fallbackTriggers = [
      'quota exceeded',
      'quota',
      'limit exceeded',
      'free tier',
      'free-tier',
      'rate limit',
      'too many requests',
      'timeout',
      'etimedout',
      'econnrefused',
      'network error',
      'api error',
      'unauthorized',
      'authentication failed',
      'validation error',        // Resend validation errors
      'validation_error',        // Resend validation errors
      'invalid `from` field',    // Resend from field errors
      'domain or from address',  // Our custom validation error message
      '401',
      '403',
      '422',                     // Validation error status code
      '429',
      '500',
      '502',
      '503',
      '504',
    ]

    const shouldFallback = fallbackTriggers.some(trigger => 
      errorMessage.includes(trigger)
    )

    if (shouldFallback) {
      console.log(`[EMAIL_DISPATCHER] 🔄 Fallback triggered by: ${response.error}`)
    }

    return shouldFallback
  }

  /**
   * Get provider status information
   */
  getProviderStatus() {
    return {
      primary: {
        type: this.primaryProvider.providerType,
        configured: this.primaryProvider.isConfigured(),
      },
      fallback: {
        type: this.fallbackProvider.providerType,
        configured: this.fallbackProvider.isConfigured(),
      },
      fallbackEnabled: this.enableFallback,
    }
  }

  /**
   * Get recent email logs
   */
  async getRecentLogs(limit: number = 50): Promise<EmailLog[]> {
    return this.logger.getRecentLogs(limit)
  }

  /**
   * Get email statistics
   */
  async getStatistics() {
    return this.logger.getStatistics()
  }
}

// Singleton instance for application-wide use
let dispatcherInstance: EmailDispatcher | null = null

/**
 * Get the global email dispatcher instance
 */
export function getEmailDispatcher(): EmailDispatcher {
  if (!dispatcherInstance) {
    const enableFallback = process.env.EMAIL_ENABLE_FALLBACK !== 'false'
    dispatcherInstance = new EmailDispatcher(enableFallback)
  }
  return dispatcherInstance
}

/**
 * Convenience function to send email using the global dispatcher
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResponse> {
  const dispatcher = getEmailDispatcher()
  return dispatcher.sendEmail(payload)
}

