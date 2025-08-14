import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EventEvaluationForm } from "@/components/dashboard/event-evaluation-form"

export default async function EventEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard")
  }

  const { id } = await params

  return (
    <DashboardShell>
      <EventEvaluationForm eventId={id} studentId={session.user.studentId} />
    </DashboardShell>
  )
} 