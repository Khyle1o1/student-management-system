import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SettingsClient } from "@/components/dashboard/settings-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"

interface SettingsActionsProps {}

function SettingsActions({}: SettingsActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 w-full sm:w-auto gap-2 sm:gap-0">
      <Link href="/dashboard/notifications/settings" className="w-full sm:w-auto">
        <Button variant="outline" className="w-full sm:w-auto">
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </Button>
      </Link>
    </div>
  )
}

interface SettingsHeaderProps {}

function SettingsHeader({}: SettingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage system settings, backups, imports, and notification defaults.
        </p>
      </div>
      <SettingsActions />
    </div>
  )
}

export default async function SettingsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // Only ADMIN can access system settings
  if (session.user.role !== "ADMIN") {
    redirect("/403")
  }

  return (
    <DashboardShell>
      <div className="space-y-4 sm:space-y-6">
        <SettingsHeader />
        <SettingsClient />
      </div>
    </DashboardShell>
  )
}