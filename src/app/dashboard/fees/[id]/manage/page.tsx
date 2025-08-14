import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FeeManagement } from "@/components/dashboard/fee-management"

interface FeeManagePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function FeeManagePage({ params }: FeeManagePageProps) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const { id } = await params

  return (
    <DashboardShell>
      <FeeManagement feeId={id} />
    </DashboardShell>
  )
} 