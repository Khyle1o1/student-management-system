import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import FormEditClient from "./form-edit-client"

export default async function EditFormPage({ params }: any) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // ADMIN, EVENTS_STAFF, and org accounts can edit forms/evaluations
  if (!['ADMIN','EVENTS_STAFF','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
    redirect("/403")
  }

  const formId = params.id

  return (
    <DashboardShell>
      <FormEditClient formId={formId} />
    </DashboardShell>
  )
}

