import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EventEvaluationForm } from "@/components/dashboard/event-evaluation-form"

export default async function EventEvaluationPage({ params }: { params: { id: string } }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <EventEvaluationForm eventId={params.id} studentId={session.user.studentId} />
    </DashboardShell>
  )
} 