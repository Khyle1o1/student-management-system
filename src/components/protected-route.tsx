"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Protected Route Wrapper
 * 
 * Client-side protection that works alongside server-side auth checks.
 * Gives session time to recover during mode switches before redirecting.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasWaited, setHasWaited] = useState(false)

  useEffect(() => {
    // Skip check for non-protected routes
    if (!pathname?.startsWith('/dashboard')) {
      setIsChecking(false)
      return
    }

    // Wait a bit for session to load (handles mode switches)
    const waitTimer = setTimeout(() => {
      setHasWaited(true)
    }, 1500) // Give 1.5 seconds for session to recover

    // Check session status
    if (status === 'loading') {
      // Still loading - wait
      return () => clearTimeout(waitTimer)
    }

    if (status === 'unauthenticated' && hasWaited) {
      // Check if this might be a mode switch
      const isModeSwitch = 
        typeof window !== 'undefined' &&
        (sessionStorage.getItem('app_mode_switch_detected') === 'true' ||
         document.referrer?.includes(window.location.hostname))

      if (!isModeSwitch) {
        // Not a mode switch - redirect to login
        setIsChecking(false)
        router.replace('/auth/login')
      } else {
        // Mode switch detected - wait a bit more
        const modeSwitchTimer = setTimeout(() => {
          if (status === 'unauthenticated') {
            setIsChecking(false)
            router.replace('/auth/login')
          } else {
            setIsChecking(false)
          }
        }, 2000)
        return () => {
          clearTimeout(waitTimer)
          clearTimeout(modeSwitchTimer)
        }
      }
    }

    if (status === 'authenticated') {
      setIsChecking(false)
    }

    return () => clearTimeout(waitTimer)
  }, [status, session, pathname, router, hasWaited])

  // Show loading state while checking
  if (isChecking && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // If authenticated, show children
  if (status === 'authenticated') {
    return <>{children}</>
  }

  // If unauthenticated and not checking, show nothing (redirect will happen)
  if (status === 'unauthenticated' && hasWaited) {
    return null
  }

  // Default: show loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
}

