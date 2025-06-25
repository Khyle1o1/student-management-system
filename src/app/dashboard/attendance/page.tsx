import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EventAttendanceManager } from "@/components/dashboard/event-attendance-manager"
import { Button } from "@/components/ui/button"
import { History } from "lucide-react"
import Link from "next/link"

export default async function AttendancePage() {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Event Attendance</h1>
            <p className="text-muted-foreground">
              Select an event to manage student attendance with IN/OUT tracking
            </p>
          </div>
          <Link href="/dashboard/attendance/history">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              View History
            </Button>
          </Link>
        </div>
        
        <EventAttendanceManager />
      </div>
    </DashboardShell>
  )
} 