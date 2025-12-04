import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { AdminProfile } from "@/components/dashboard/admin-profile"

export default async function AdminProfilePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "COLLEGE_ORG" &&
    session.user.role !== "COURSE_ORG"
  ) {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            My Account
          </h1>
          <p className="text-muted-foreground">
            Manage your profile information and password
          </p>
        </div>

        <AdminProfile />
      </div>
    </DashboardShell>
  )
}


