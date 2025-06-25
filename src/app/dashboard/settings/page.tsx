import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { BatchStudentImport } from "@/components/dashboard/batch-student-import"

export default async function SettingsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage system settings and bulk operations
            </p>
          </div>
        </div>
        
        <BatchStudentImport />
      </div>
    </DashboardShell>
  )
} 