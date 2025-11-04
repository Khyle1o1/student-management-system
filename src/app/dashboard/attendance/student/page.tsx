import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StudentAttendance } from "@/components/dashboard/student-attendance"

export default async function StudentAttendancePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "USER") {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Attendance</h1>
          <p className="text-muted-foreground">
            View your attendance records and statistics across all events
          </p>
        </div>
        
        <StudentAttendance studentId={session.user.studentId} />
      </div>
    </DashboardShell>
  )
} 