import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FormBuilder } from "@/components/forms/FormBuilder"

export default async function NewFormPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (!['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <FormBuilder />
    </DashboardShell>
  )
}

