"use client"

import { useSessionTimeout } from '@/hooks/use-session-timeout'

/**
 * SessionTimeoutManager Component
 * 
 * This component manages the global session timeout functionality.
 * It should be included in the root layout to work across all pages.
 * 
 * Features:
 * - Monitors user activity (mouse, keyboard, scroll, touch events)
 * - Tracks last activity timestamp in sessionStorage
 * - Automatically logs out users after 1 minute of inactivity
 * - Checks session validity when user returns to the tab
 * - Shows notification when session expires
 * 
 * The component itself renders nothing (null), but sets up all necessary
 * event listeners and timers to manage the session timeout.
 */
export function SessionTimeoutManager() {
  // Use the session timeout hook to manage all timeout logic
  useSessionTimeout()

  // This component doesn't render anything
  return null
}

