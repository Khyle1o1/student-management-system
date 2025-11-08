/**
 * Session Storage Utility for managing session timeout
 * Stores and retrieves last activity timestamp in sessionStorage
 */

const LAST_ACTIVITY_KEY = 'app_last_activity_timestamp'
const SESSION_TIMEOUT_MS = 60 * 1000 // 1 minute in milliseconds

/**
 * Get the last activity timestamp from sessionStorage
 * @returns The timestamp as a number, or null if not found
 */
export function getLastActivity(): number | null {
  if (typeof window === 'undefined') return null
  
  try {
    const timestamp = sessionStorage.getItem(LAST_ACTIVITY_KEY)
    return timestamp ? parseInt(timestamp, 10) : null
  } catch (error) {
    console.error('Error reading from sessionStorage:', error)
    return null
  }
}

/**
 * Update the last activity timestamp in sessionStorage
 */
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return
  
  try {
    const now = Date.now()
    sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString())
  } catch (error) {
    console.error('Error writing to sessionStorage:', error)
  }
}

/**
 * Check if the session has timed out based on the last activity timestamp
 * @returns true if session has expired, false otherwise
 */
export function isSessionExpired(): boolean {
  const lastActivity = getLastActivity()
  
  // If no last activity recorded, session is not expired (first load)
  if (lastActivity === null) {
    return false
  }
  
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivity
  
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
    const authKeys = [LAST_ACTIVITY_KEY]
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

