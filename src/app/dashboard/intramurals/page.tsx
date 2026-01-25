import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { IntramuralsMedalManagement } from "@/components/intramurals/IntramuralsMedalManagement"

export default async function IntramuralsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // Intramurals admin panel is restricted to ADMIN and INTRAMURALS_STAFF only
  if (session.user.role !== 'ADMIN' && session.user.role !== 'INTRAMURALS_STAFF') {
    redirect("/403")
  }

  return (
    <DashboardShell>
      <IntramuralsMedalManagement />
    </DashboardShell>
  )
}

