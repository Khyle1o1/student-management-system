"use client"

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Session Recovery Component
 * 
 * Handles session recovery during mode switches and page reloads.
 * Prevents false redirects to login when cookies are temporarily unavailable.
 */
export function SessionRecovery() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const hasAttemptedRecovery = useRef(false)
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusRef = useRef(status)
  const sessionRef = useRef(session)

  // Keep refs in sync with current values
  useEffect(() => {
    statusRef.current = status
    sessionRef.current = session
  }, [status, session])

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return

    // Skip if already attempted recovery
    if (hasAttemptedRecovery.current) return

    // Only handle recovery on login page or when session is loading
    const isLoginPage = pathname?.startsWith('/auth/login')
    const isAuthenticatedRoute = pathname?.startsWith('/dashboard')

    // If we're on login page but have a valid session, redirect to dashboard
    if (isLoginPage && status === 'authenticated' && session) {
      hasAttemptedRecovery.current = true
      router.replace('/dashboard')
      return
    }

    // If we're on login page and session is loading, wait for it to load
    if (isLoginPage && status === 'loading') {
      // Wait for session to load (up to 3 seconds)
      recoveryTimeoutRef.current = setTimeout(() => {
        // Use refs to get current values inside timeout
        if (statusRef.current === 'authenticated' && sessionRef.current) {
          router.replace('/dashboard')
        }
        hasAttemptedRecovery.current = true
      }, 3000)
    }

    // If we're on an authenticated route but session is loading, wait a bit
    // This handles cases where cookies are temporarily unavailable during mode switch
    if (isAuthenticatedRoute && status === 'loading') {
      // Wait up to 3 seconds for session to load
      recoveryTimeoutRef.current = setTimeout(() => {
        // Use refs to get current values inside timeout
        if (statusRef.current === 'unauthenticated') {
          // Only redirect if still unauthenticated after waiting
          // This prevents false redirects during mode switches
          const isModeSwitch = 
            sessionStorage.getItem('app_mode_switch_detected') === 'true' ||
            (document.referrer && document.referrer.includes(window.location.hostname))
          
          if (!isModeSwitch) {
            router.replace('/auth/login')
          } else {
            // Clear the mode switch flag
            sessionStorage.removeItem('app_mode_switch_detected')
            // Don't redirect - let SessionProvider try to recover the session
            // The user might still have valid cookies that just need time to be read
          }
        }
        hasAttemptedRecovery.current = true
      }, 3000)
    }

    // Cleanup
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current)
      }
    }
  }, [session, status, pathname, router])

  // This component doesn't render anything
  return null
}

