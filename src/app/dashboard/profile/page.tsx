import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StudentProfile } from "@/components/dashboard/student-profile"

export default async function StudentProfilePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            View and update your personal information
          </p>
        </div>
        
        <StudentProfile studentId={session.user.studentId} />
      </div>
    </DashboardShell>
  )
} 