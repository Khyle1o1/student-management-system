"use client"

import { useRouter } from "next/navigation"
import EvaluationForm from "@/components/dashboard/EvaluationForm"

interface EditEvaluationFormProps {
  evaluationId: string
}

export function EditEvaluationForm({ evaluationId }: EditEvaluationFormProps) {
  const router = useRouter()

  const handleSave = (evaluationId: string) => {
    router.push('/dashboard/evaluations')
  }

  const handleCancel = () => {
    router.push('/dashboard/evaluations')
  }

  return (
    <EvaluationForm 
      evaluationId={evaluationId}
      onSave={handleSave} 
      onCancel={handleCancel} 
    />
  )
} 