/**
 * Session Storage Utility for managing session timeout
 * Stores and retrieves last activity timestamp in sessionStorage
 * 
 * Resilient to storage clearing during mobile/desktop mode switches
 */

const LAST_ACTIVITY_KEY = 'app_last_activity_timestamp'
const FALLBACK_ACTIVITY_KEY = 'app_last_activity_fallback' // Fallback for mode switches
const SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes in milliseconds
const MODE_SWITCH_GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes grace period for mode switches

/**
 * Get the last activity timestamp from sessionStorage with fallback
 * @returns The timestamp as a number, or null if not found
 */
export function getLastActivity(): number | null {
  if (typeof window === 'undefined') return null
  
  try {
    // Try primary storage first
    const timestamp = sessionStorage.getItem(LAST_ACTIVITY_KEY)
    if (timestamp) {
      return parseInt(timestamp, 10)
    }
    
    // Fallback: check if we have a recent fallback timestamp (within grace period)
    // This handles cases where sessionStorage was cleared during mode switch
    const fallbackTimestamp = sessionStorage.getItem(FALLBACK_ACTIVITY_KEY)
    if (fallbackTimestamp) {
      const fallbackTime = parseInt(fallbackTimestamp, 10)
      const now = Date.now()
      // Only use fallback if it's recent (within grace period)
      if (now - fallbackTime < MODE_SWITCH_GRACE_PERIOD_MS) {
        return fallbackTime
      }
    }
    
    return null
  } catch (error) {
    console.error('Error reading from sessionStorage:', error)
    return null
  }
}

/**
 * Update the last activity timestamp in sessionStorage
 * Also stores a fallback copy for mode switch resilience
 */
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return
  
  try {
    const now = Date.now()
    const timestamp = now.toString()
    
    // Store in primary location
    sessionStorage.setItem(LAST_ACTIVITY_KEY, timestamp)
    
    // Also store fallback for mode switch resilience
    sessionStorage.setItem(FALLBACK_ACTIVITY_KEY, timestamp)
  } catch (error) {
    console.error('Error writing to sessionStorage:', error)
  }
}

/**
 * Check if the session has timed out based on the last activity timestamp
 * Includes grace period for mode switches to prevent false expiration
 * @returns true if session has expired, false otherwise
 */
export function isSessionExpired(): boolean {
  const lastActivity = getLastActivity()
  
  // If no last activity recorded, session is not expired (first load or mode switch)
  // This prevents false expiration when sessionStorage is cleared during mode switch
  if (lastActivity === null) {
    return false
  }
  
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivity
  
  // Add grace period to prevent false expiration during mode switches
  // If activity was recent (within grace period), don't expire
  if (timeSinceLastActivity < MODE_SWITCH_GRACE_PERIOD_MS) {
    return false
  }
  
  return timeSinceLastActivity > SESSION_TIMEOUT_MS
}

/**
 * Clear the last activity timestamp from sessionStorage
 */
export function clearLastActivity(): void {
  if (typeof window === 'undefined') return
  
  try {
    sessionStorage.removeItem(LAST_ACTIVITY_KEY)
  } catch (error) {
    console.error('Error clearing sessionStorage:', error)
  }
}

/**
 * Clear all authentication-related data from sessionStorage
 */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') return
  
  try {
    // Clear the last activity timestamp
    clearLastActivity()
    
    // Clear any other auth-related session storage items
    // Add more keys here if you store other auth data in sessionStorage
    const authKeys = [LAST_ACTIVITY_KEY, FALLBACK_ACTIVITY_KEY]
    authKeys.forEach(key => sessionStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing auth session:', error)
  }
}

/**
 * Get the session timeout duration in milliseconds
 */
export function getSessionTimeout(): number {
  return SESSION_TIMEOUT_MS
}

