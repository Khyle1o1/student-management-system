import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FeeForm } from "@/components/dashboard/fee-form"

export default async function NewFeePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Create New Fee</h1>
          <p className="text-muted-foreground">
            Add a new fee structure to the system
          </p>
        </div>
        
        <FeeForm />
      </div>
    </DashboardShell>
  )
} 