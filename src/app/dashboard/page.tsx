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