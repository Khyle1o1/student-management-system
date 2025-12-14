/**
 * Email Provider Abstraction Layer
 * 
 * This module defines the interfaces and types for the dual email provider system
 * with automatic fallback from Resend to SMTP.
 */

export interface EmailPayload {
  to: string | string[]
  from?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface EmailResponse {
  success: boolean
  messageId?: string
  error?: string
  provider?: EmailProviderType
  timestamp?: Date
}

export enum EmailProviderType {
  RESEND = 'resend',
  SMTP = 'smtp',
}

export enum EmailErrorType {
  // Resend-specific errors
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT = 'RATE_LIMIT',
  API_ERROR = 'API_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  
  // SMTP-specific errors
  SMTP_CONNECTION_ERROR = 'SMTP_CONNECTION_ERROR',
  SMTP_AUTH_ERROR = 'SMTP_AUTH_ERROR',
  SMTP_SEND_ERROR = 'SMTP_SEND_ERROR',
  
  // General errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface EmailError {
  type: EmailErrorType
  message: string
  originalError?: any
  shouldFallback: boolean
}

/**
 * Abstract interface that all email providers must implement
 */
export interface IEmailProvider {
  /**
   * The type of provider
   */
  readonly providerType: EmailProviderType
  
  /**
   * Send an email using this provider
   */
  sendEmail(payload: EmailPayload): Promise<EmailResponse>
  
  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean
  
  /**
   * Parse provider-specific errors into standardized EmailError
   */
  parseError(error: any): EmailError
}

export interface EmailProviderConfig {
  primaryProvider: EmailProviderType
  fallbackProvider: EmailProviderType
  enableFallback: boolean
  retryAttempts?: number
  timeoutMs?: number
}

export interface EmailLog {
  id?: string
  to: string
  subject: string
  provider: EmailProviderType
  success: boolean
  error?: string
  messageId?: string
  attemptedProviders: EmailProviderType[]
  timestamp: Date
  fallbackUsed: boolean
}

