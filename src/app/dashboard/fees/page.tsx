import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FeesManagement } from "@/components/dashboard/fees-management"
import { getOrgAccessLevelFromSession } from "@/lib/org-permissions"

export default async function FeesPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (!['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
    redirect("/dashboard")
  }

  const orgAccessLevel = getOrgAccessLevelFromSession(session as any)

  // Event accounts cannot access Fees page at all
  if (session.user.role === "COLLEGE_ORG" && orgAccessLevel === "event") {
    redirect("/403")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Fees Management</h1>
          <p className="text-muted-foreground">
            Manage fee structures for the school
          </p>
        </div>
        
        <FeesManagement />
      </div>
    </DashboardShell>
  )
} 