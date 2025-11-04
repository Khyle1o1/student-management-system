import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default async function PendingPaymentsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // Receipt upload and approval workflow has been removed.
  // Redirect all roles back to dashboard.
  redirect("/dashboard")

  return (
    <DashboardShell>
      <div />
    </DashboardShell>
  )
}

