/**
 * LEGACY EMAIL MODULE - BACKWARD COMPATIBILITY SHIM
 * 
 * This file now redirects to the unified email service which uses
 * the dual provider system (Resend → SMTP fallback).
 * 
 * All functions maintain the same API for backward compatibility.
 */

// Re-export everything from the unified service
export {
  sendAttendanceConfirmationEmail,
  sendEvaluationReminderEmail,
  sendCertificateAvailableEmail,
  type AttendanceEmailData,
  type EvaluationReminderEmailData,
  type CertificateAvailableEmailData,
} from './email-service-unified'

// Legacy export notice
console.log('[EMAIL] Using unified dual-provider email system (Resend → SMTP fallback)')
console.log('[EMAIL] Legacy email.ts is now a compatibility shim') 