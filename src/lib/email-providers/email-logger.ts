/**
 * Email Logger
 * 
 * Handles logging and monitoring of email sending attempts
 */

import { EmailLog, EmailProviderType } from './types'

export interface EmailStatistics {
  totalSent: number
  totalFailed: number
  successRate: number
  resendCount: number
  smtpCount: number
  fallbackCount: number
  recentErrors: Array<{
    error: string
    timestamp: Date
    count: number
  }>
}

export class EmailLogger {
  private logs: EmailLog[] = []
  private maxLogs: number = 1000 // Keep last 1000 logs in memory

  /**
   * Log an email sending attempt
   */
  async logEmail(log: EmailLog): Promise<void> {
    const logEntry: EmailLog = {
      ...log,
      id: this.generateLogId(),
    }

    // Add to in-memory logs
    this.logs.unshift(logEntry)

    // Trim if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Console log for immediate visibility
    this.consoleLog(logEntry)

    // TODO: In production, you may want to persist to database
    // await this.persistToDatabase(logEntry)
  }

  /**
   * Pretty print log to console
   */
  private consoleLog(log: EmailLog) {
    const timestamp = log.timestamp.toISOString()
    const status = log.success ? '✓ SUCCESS' : '✗ FAILED'
    const fallbackInfo = log.fallbackUsed ? ' (via FALLBACK)' : ''
    const providers = log.attemptedProviders.join(' → ')

    console.log(`[EMAIL_LOG] ${timestamp}`)
    console.log(`[EMAIL_LOG] ${status}${fallbackInfo}`)
    console.log(`[EMAIL_LOG] To: ${log.to}`)
    console.log(`[EMAIL_LOG] Subject: ${log.subject}`)
    console.log(`[EMAIL_LOG] Provider: ${log.provider}`)
    console.log(`[EMAIL_LOG] Attempted: ${providers}`)
    
    if (log.messageId) {
      console.log(`[EMAIL_LOG] Message ID: ${log.messageId}`)
    }
    
    if (log.error) {
      console.log(`[EMAIL_LOG] Error: ${log.error}`)
    }
    
    console.log(`[EMAIL_LOG] ----------------------------------------\n`)
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(limit: number = 50): Promise<EmailLog[]> {
    return this.logs.slice(0, limit)
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<EmailStatistics> {
    const totalSent = this.logs.filter(log => log.success).length
    const totalFailed = this.logs.filter(log => !log.success).length
    const total = this.logs.length
    const successRate = total > 0 ? (totalSent / total) * 100 : 0

    const resendCount = this.logs.filter(
      log => log.provider === EmailProviderType.RESEND && log.success
    ).length

    const smtpCount = this.logs.filter(
      log => log.provider === EmailProviderType.SMTP && log.success
    ).length

    const fallbackCount = this.logs.filter(
      log => log.fallbackUsed && log.success
    ).length

    // Group errors
    const errorMap = new Map<string, { count: number; lastSeen: Date }>()
    
    this.logs
      .filter(log => !log.success && log.error)
      .forEach(log => {
        const error = log.error!
        const existing = errorMap.get(error)
        
        if (existing) {
          existing.count++
          if (log.timestamp > existing.lastSeen) {
            existing.lastSeen = log.timestamp
          }
        } else {
          errorMap.set(error, {
            count: 1,
            lastSeen: log.timestamp,
          })
        }
      })

    const recentErrors = Array.from(errorMap.entries())
      .map(([error, data]) => ({
        error,
        timestamp: data.lastSeen,
        count: data.count,
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10) // Top 10 recent errors

    return {
      totalSent,
      totalFailed,
      successRate: Math.round(successRate * 100) / 100,
      resendCount,
      smtpCount,
      fallbackCount,
      recentErrors,
    }
  }

  /**
   * Clear all logs (useful for testing)
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Generate a unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Export logs as JSON
   */
  async exportLogs(): Promise<string> {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Get logs filtered by criteria
   */
  async getFilteredLogs(filters: {
    success?: boolean
    provider?: EmailProviderType
    fallbackUsed?: boolean
    startDate?: Date
    endDate?: Date
  }): Promise<EmailLog[]> {
    return this.logs.filter(log => {
      if (filters.success !== undefined && log.success !== filters.success) {
        return false
      }
      
      if (filters.provider && log.provider !== filters.provider) {
        return false
      }
      
      if (filters.fallbackUsed !== undefined && log.fallbackUsed !== filters.fallbackUsed) {
        return false
      }
      
      if (filters.startDate && log.timestamp < filters.startDate) {
        return false
      }
      
      if (filters.endDate && log.timestamp > filters.endDate) {
        return false
      }
      
      return true
    })
  }

  /**
   * Get provider performance comparison
   */
  async getProviderPerformance(): Promise<{
    resend: { total: number; success: number; failed: number; successRate: number }
    smtp: { total: number; success: number; failed: number; successRate: number }
  }> {
    const resendLogs = this.logs.filter(log => log.provider === EmailProviderType.RESEND)
    const smtpLogs = this.logs.filter(log => log.provider === EmailProviderType.SMTP)

    const calculateStats = (logs: EmailLog[]) => {
      const total = logs.length
      const success = logs.filter(l => l.success).length
      const failed = logs.filter(l => !l.success).length
      const successRate = total > 0 ? (success / total) * 100 : 0
      
      return { total, success, failed, successRate: Math.round(successRate * 100) / 100 }
    }

    return {
      resend: calculateStats(resendLogs),
      smtp: calculateStats(smtpLogs),
    }
  }
}

