import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StudentFees } from "@/components/dashboard/student-fees"

export default async function StudentFeesPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">My Fees</h1>
          <p className="text-muted-foreground">
            View your fee obligations and payment history
          </p>
        </div>
        
        <StudentFees studentId={session.user.studentId} />
      </div>
    </DashboardShell>
  )
} 