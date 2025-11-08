"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  getLastActivity, 
  updateLastActivity, 
  isSessionExpired, 
  clearAuthSession 
} from '@/lib/session-storage'
import { useToast } from '@/hooks/use-toast'

/**
 * Hook to manage session timeout based on user inactivity
 * Monitors user activity and automatically logs out after timeout period
 */
export function useSessionTimeout() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasCheckedInitialSession = useRef(false)
  const isSigningOut = useRef(false)

  /**
   * Handle session expiry - sign out and redirect to login
   */
  const handleSessionExpiry = useCallback(async () => {
    // Prevent multiple simultaneous sign-out attempts
    if (isSigningOut.current) return
    isSigningOut.current = true

    // Clear all session storage
    clearAuthSession()

    // Show expiry message
    toast({
      title: "Session Expired",
      description: "Your session has expired due to inactivity. Please log in again.",
      variant: "destructive",
    })

    // Sign out and redirect to login
    try {
      await signOut({ 
        redirect: true, 
        callbackUrl: '/auth/login' 
      })
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if signOut fails
      router.push('/auth/login')
      router.refresh()
    } finally {
      isSigningOut.current = false
    }
  }, [router, toast])

  /**
   * Update the last activity timestamp
   */
  const handleActivity = useCallback(() => {
    if (status === 'authenticated') {
      updateLastActivity()
    }
  }, [status])

  /**
   * Check if session has expired
   */
  const checkSessionExpiry = useCallback(() => {
    if (status === 'authenticated' && isSessionExpired()) {
      handleSessionExpiry()
    }
  }, [status, handleSessionExpiry])

  // Check session on initial mount
  useEffect(() => {
    if (status === 'authenticated' && !hasCheckedInitialSession.current) {
      hasCheckedInitialSession.current = true
      
      const lastActivity = getLastActivity()
      
      if (lastActivity === null) {
        // First time loading - set initial activity
        updateLastActivity()
      } else if (isSessionExpired()) {
        // Session has expired
        handleSessionExpiry()
      } else {
        // Session is still valid - update activity
        updateLastActivity()
      }
    }
  }, [status, handleSessionExpiry])

  // Set up activity listeners
  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    // List of events to track user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Throttle activity updates (don't update more than once per second)
    let throttleTimeout: NodeJS.Timeout | null = null
    const throttledHandleActivity = () => {
      if (!throttleTimeout) {
        handleActivity()
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null
        }, 1000)
      }
    }

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, throttledHandleActivity, true)
    })

    // Check for expiry periodically (every 10 seconds)
    checkIntervalRef.current = setInterval(() => {
      checkSessionExpiry()
    }, 10000)

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledHandleActivity, true)
      })
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
    }
  }, [status, handleActivity, checkSessionExpiry])

  // Handle page visibility changes (tab switching, minimizing)
  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back to the tab - check if session expired
        if (isSessionExpired()) {
          handleSessionExpiry()
        } else {
          // Update activity timestamp
          updateLastActivity()
        }
      } else {
        // User left the tab - update last activity
        updateLastActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, handleSessionExpiry])

  // Handle beforeunload - update last activity before tab/window closes
  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const handleBeforeUnload = () => {
      updateLastActivity()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [status])

  // Clear session storage on sign out
  useEffect(() => {
    if (status === 'unauthenticated' && !isSigningOut.current) {
      clearAuthSession()
    }
  }, [status])

  return {
    isAuthenticated: status === 'authenticated',
    session,
  }
}

