import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FormBuilder } from "@/components/forms/FormBuilder"

export default async function NewFormPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // ADMIN, EVENTS_STAFF, and org accounts can create forms/evaluations
  if (!['ADMIN','EVENTS_STAFF','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
    redirect("/403")
  }

  return (
    <DashboardShell>
      <FormBuilder />
    </DashboardShell>
  )
}

