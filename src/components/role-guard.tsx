"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"
import {
  canAccessDashboard,
  canAccessEvents,
  canAccessAttendance,
  canAccessCertificates,
  canAccessEvaluations,
  canAccessIntramurals,
  canAccessSettings,
  canAccessUserManagement,
  type UserPermissions
} from "@/lib/rbac"

interface RoleGuardProps {
  children: ReactNode
  /**
   * Permission check function
   */
  requirePermission?: (user: UserPermissions) => boolean
  /**
   * Fallback URL when permission is denied
   */
  fallbackUrl?: string
  /**
   * Show loading state while checking permissions
   */
  showLoading?: boolean
}

/**
 * Client-side route guard component
 * Redirects users who don't have the required permissions
 */
export function RoleGuard({
  children,
  requirePermission,
  fallbackUrl = "/403",
  showLoading = true
}: RoleGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    // Not authenticated
    if (!session?.user) {
      router.push("/auth/login")
      return
    }

    // Check permission if provided
    if (requirePermission) {
      const user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        status: (session.user.status as 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED') || 'ACTIVE',
        assigned_college: session.user.assigned_college,
        assigned_course: session.user.assigned_course,
        assigned_courses: session.user.assigned_courses,
        org_access_level: session.user.org_access_level
      } as UserPermissions

      if (!requirePermission(user)) {
        router.push(fallbackUrl)
        return
      }
    }
  }, [session, status, requirePermission, fallbackUrl, router])

  // Loading state
  if (status === "loading" && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Not authenticated
  if (!session?.user) {
    return null
  }

  // Check permission
  if (requirePermission) {
    const user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      status: (session.user.status as 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED') || 'ACTIVE',
      assigned_college: session.user.assigned_college,
      assigned_course: session.user.assigned_course,
      assigned_courses: session.user.assigned_courses,
      org_access_level: session.user.org_access_level
    } as UserPermissions

    if (!requirePermission(user)) {
      return null
    }
  }

  return <>{children}</>
}

/**
 * Pre-configured role guards for common pages
 */

export function DashboardGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessDashboard}>
      {children}
    </RoleGuard>
  )
}

export function EventsGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessEvents}>
      {children}
    </RoleGuard>
  )
}

export function AttendanceGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessAttendance}>
      {children}
    </RoleGuard>
  )
}

export function CertificatesGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessCertificates}>
      {children}
    </RoleGuard>
  )
}

export function EvaluationsGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessEvaluations}>
      {children}
    </RoleGuard>
  )
}

export function IntramuralsGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessIntramurals}>
      {children}
    </RoleGuard>
  )
}

export function SettingsGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessSettings}>
      {children}
    </RoleGuard>
  )
}

export function UserManagementGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePermission={canAccessUserManagement}>
      {children}
    </RoleGuard>
  )
}
