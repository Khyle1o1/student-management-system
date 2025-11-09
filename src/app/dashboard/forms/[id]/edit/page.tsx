"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { FormBuilder } from "@/components/forms/FormBuilder"
import { toast } from "react-hot-toast"

export default function EditFormPage() {
  const params = useParams()
  const formId = params.id as string
  const [formData, setFormData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchForm()
  }, [formId])

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}`)
      if (!response.ok) throw new Error('Failed to fetch form')
      
      const data = await response.json()
      setFormData(data)
    } catch (error) {
      console.error('Error fetching form:', error)
      toast.error('Failed to load form')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading form...</div>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Form not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <FormBuilder 
        formId={formId}
        initialData={{
          title: formData.title,
          description: formData.description,
          questions: formData.questions,
          settings: formData.settings,
          status: formData.status,
        }}
      />
    </div>
  )
}

