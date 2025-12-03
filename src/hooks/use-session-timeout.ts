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
 * 
 * Resilient to mobile/desktop mode switches - prevents false logout
 */
export function useSessionTimeout() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasCheckedInitialSession = useRef(false)
  const isSigningOut = useRef(false)
  const lastViewportSize = useRef<{ width: number; height: number } | null>(null)
  const lastUserAgent = useRef<string | null>(null)
  const isModeSwitching = useRef(false)

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
   * Skips check during mode switches to prevent false expiration
   */
  const checkSessionExpiry = useCallback(() => {
    // Don't check expiration during mode switch
    if (isModeSwitching.current) {
      return
    }
    
    if (status === 'authenticated' && isSessionExpired()) {
      handleSessionExpiry()
    }
  }, [status, handleSessionExpiry])

  /**
   * Detect if viewport or user-agent changed (indicating mode switch)
   */
  const detectModeSwitch = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    
    const currentViewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    const currentUserAgent = navigator.userAgent
    
    // Initialize on first call
    if (lastViewportSize.current === null || lastUserAgent.current === null) {
      lastViewportSize.current = currentViewport
      lastUserAgent.current = currentUserAgent
      return false
    }
    
    // Check for significant viewport change (mode switch indicator)
    const viewportChanged = 
      Math.abs(currentViewport.width - lastViewportSize.current.width) > 200 ||
      Math.abs(currentViewport.height - lastViewportSize.current.height) > 200
    
    // Check for user-agent change (desktop mode toggle)
    const userAgentChanged = currentUserAgent !== lastUserAgent.current
    
    // Update refs
    lastViewportSize.current = currentViewport
    lastUserAgent.current = currentUserAgent
    
    return viewportChanged || userAgentChanged
  }, [])

  // Check session on initial mount
  useEffect(() => {
    if (status === 'authenticated' && !hasCheckedInitialSession.current) {
      hasCheckedInitialSession.current = true
      
      // Initialize viewport/user-agent tracking
      if (typeof window !== 'undefined') {
        lastViewportSize.current = {
          width: window.innerWidth,
          height: window.innerHeight
        }
        lastUserAgent.current = navigator.userAgent
      }
      
      const lastActivity = getLastActivity()
      
      if (lastActivity === null) {
        // First time loading or mode switch - set initial activity
        updateLastActivity()
      } else if (isSessionExpired()) {
        // Only expire if not in a mode switch scenario
        // Check if this might be a mode switch (no activity but recent page load)
        // Use performance.timeOrigin (modern) or fallback to current time
        const pageLoadTime = typeof performance !== 'undefined' && performance.timeOrigin 
          ? performance.timeOrigin 
          : Date.now() - (typeof performance !== 'undefined' && (performance as any).timing?.navigationStart 
            ? (performance as any).timing.navigationStart 
            : Date.now())
        const timeSincePageLoad = Date.now() - pageLoadTime
        if (timeSincePageLoad < 60000) {
          // Recent page load - might be mode switch, don't expire
          updateLastActivity()
        } else {
          // Session has expired
          handleSessionExpiry()
        }
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

  // Handle page visibility changes (tab switching, minimizing, mode switches)
  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back to the tab - check for mode switch first
        const modeSwitched = detectModeSwitch()
        
        if (modeSwitched) {
          // Mode switch detected - don't expire session, just update activity
          isModeSwitching.current = true
          updateLastActivity()
          
          // Mark mode switch in sessionStorage for session recovery component
          try {
            sessionStorage.setItem('app_mode_switch_detected', 'true')
            // Clear the flag after 5 seconds
            setTimeout(() => {
              sessionStorage.removeItem('app_mode_switch_detected')
            }, 5000)
          } catch (e) {
            // Ignore storage errors
          }
          
          // Reset mode switching flag after a short delay
          setTimeout(() => {
            isModeSwitching.current = false
          }, 2000)
          
          return // Don't check expiration during mode switch
        }
        
        // Normal visibility change - check if session expired
        // But only if not in a mode switch scenario
        if (!isModeSwitching.current) {
          if (isSessionExpired()) {
            handleSessionExpiry()
          } else {
            // Update activity timestamp
            updateLastActivity()
          }
        } else {
          // Mode switch in progress - just update activity
          updateLastActivity()
        }
      } else {
        // User left the tab - update last activity
        updateLastActivity()
      }
    }

    // Also handle resize events (viewport changes during mode switch)
    const handleResize = () => {
      const modeSwitched = detectModeSwitch()
      if (modeSwitched && status === 'authenticated') {
        // Viewport changed significantly - might be mode switch
        isModeSwitching.current = true
        updateLastActivity()
        
        // Mark mode switch in sessionStorage for session recovery component
        try {
          sessionStorage.setItem('app_mode_switch_detected', 'true')
          // Clear the flag after 5 seconds
          setTimeout(() => {
            sessionStorage.removeItem('app_mode_switch_detected')
          }, 5000)
        } catch (e) {
          // Ignore storage errors
        }
        
        setTimeout(() => {
          isModeSwitching.current = false
        }, 2000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('resize', handleResize)
    }
  }, [status, handleSessionExpiry, detectModeSwitch])

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

