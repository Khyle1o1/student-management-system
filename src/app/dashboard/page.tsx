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

  // Debug the session object
  console.log('Dashboard Page - Full session object:', JSON.stringify(session, null, 2))
  console.log('Dashboard Page - session.user:', session.user)
  console.log('Dashboard Page - session.user.studentId:', session.user.studentId)
  console.log('Dashboard Page - session.user.student_id:', session.user.student_id)
  console.log('Dashboard Page - session.user.role:', session.user.role)

  return (
    <DashboardShell>
      {session.user.role === "ADMIN" ? (
        <AdminDashboard />
      ) : (
        <StudentDashboard studentId={session.user.studentId} />
      )}
    </DashboardShell>
  )
} 