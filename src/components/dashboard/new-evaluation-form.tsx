"use client"

import { useRouter } from "next/navigation"
import EvaluationForm from "@/components/dashboard/EvaluationForm"

export function NewEvaluationForm() {
  const router = useRouter()

  const handleSave = (evaluationId: string) => {
    router.push('/dashboard/evaluations')
  }

  const handleCancel = () => {
    router.push('/dashboard/evaluations')
  }

  return (
    <EvaluationForm onSave={handleSave} onCancel={handleCancel} />
  )
} 