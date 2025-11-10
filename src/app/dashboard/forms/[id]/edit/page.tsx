import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import FormEditClient from "./form-edit-client"

interface EditFormPageProps {
  params: {
    id: string
  }
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (!['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
    redirect("/dashboard")
  }

  const formId = params.id

  return (
    <DashboardShell>
      <FormEditClient formId={formId} />
    </DashboardShell>
  )
}

