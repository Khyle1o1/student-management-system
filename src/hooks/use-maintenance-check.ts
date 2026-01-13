"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

/**
 * Hook to check maintenance mode and redirect non-admin users
 * This provides client-side protection in addition to server-side middleware
 */
export function useMaintenanceCheck() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't check if still loading or already on maintenance page
    if (status === "loading" || pathname === "/maintenance") {
      return
    }

    // Don't check on auth pages
    if (pathname?.startsWith("/auth/")) {
      return
    }

    const checkMaintenance = async () => {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store"
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // If maintenance mode is on and user is not ADMIN, redirect
          if (data.maintenance_mode && session?.user?.role !== "ADMIN") {
            router.push("/maintenance")
          }
        }
      } catch (error) {
        console.error("Error checking maintenance mode:", error)
      }
    }

    checkMaintenance()
  }, [session, status, router, pathname])
}
