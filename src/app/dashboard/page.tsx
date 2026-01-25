import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { StudentDashboard } from "@/components/dashboard/student-dashboard"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  const isAdminUser = ['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)
  
  // EVENTS_STAFF and INTRAMURALS_STAFF don't have dashboard access
  // Redirect them to their specific pages
  if (session.user.role === 'EVENTS_STAFF') {
    redirect("/dashboard/events")
  }
  
  if (session.user.role === 'INTRAMURALS_STAFF') {
    redirect("/dashboard/intramurals")
  }

  return (
    <DashboardShell>
      {isAdminUser ? (
        <AdminDashboard />
      ) : (
        <StudentDashboard studentId={session.user.studentId} />
      )}
    </DashboardShell>
  )
} 