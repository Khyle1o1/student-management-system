"use client"

import { useParams } from "next/navigation"
import { FormResponse } from "@/components/forms/FormResponse"

export default function PublicFormPage() {
  const params = useParams()
  const formId = params.id as string

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <FormResponse formId={formId} />
    </div>
  )
}

