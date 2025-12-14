/**
 * Email Providers - Main Export
 * 
 * Centralized export for the dual email provider system
 */

// Main dispatcher
export { EmailDispatcher, getEmailDispatcher, sendEmail } from './email-dispatcher'

// Providers
export { ResendEmailProvider } from './resend-provider'
export { SmtpEmailProvider } from './smtp-provider'

// Logger
export { EmailLogger } from './email-logger'

// Types
export type {
  EmailPayload,
  EmailResponse,
  EmailLog,
  IEmailProvider,
  EmailError,
  EmailProviderConfig,
} from './types'

export { EmailProviderType, EmailErrorType } from './types'

