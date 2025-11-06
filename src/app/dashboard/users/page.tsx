"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { UsersTable } from "@/components/dashboard/users-table"

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
    
    // Only ADMIN can access user management
    if (
      session?.user && 
      session.user.role !== 'ADMIN'
    ) {
      router.push("/dashboard")
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-lg font-semibold">Loading...</div>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!session?.user || (session.user.role !== 'ADMIN')) {
    return null
  }

  return (
    <DashboardShell>
      <UsersTable />
    </DashboardShell>
  )
}

