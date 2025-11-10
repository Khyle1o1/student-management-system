"use client"

import { useParams } from "next/navigation"
import { FormStatistics } from "@/components/forms/FormStatistics"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function FormStatisticsPage() {
  const params = useParams()
  const formId = params.id as string

  return (
    <DashboardShell>
      <FormStatistics formId={formId} />
    </DashboardShell>
  )
}

