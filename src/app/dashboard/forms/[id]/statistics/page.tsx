"use client"

import { useParams } from "next/navigation"
import { FormStatistics } from "@/components/forms/FormStatistics"

export default function FormStatisticsPage() {
  const params = useParams()
  const formId = params.id as string

  return (
    <FormStatistics formId={formId} />
  )
}

