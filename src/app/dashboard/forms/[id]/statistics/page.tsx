"use client"

import { useParams } from "next/navigation"
import { FormStatistics } from "@/components/forms/FormStatistics"

export default function FormStatisticsPage() {
  const params = useParams()
  const formId = params.id as string

  return (
    <div className="container mx-auto py-6">
      <FormStatistics formId={formId} />
    </div>
  )
}

