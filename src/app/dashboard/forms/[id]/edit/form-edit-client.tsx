"use client"

import { useEffect, useState } from "react"
import { FormBuilder } from "@/components/forms/FormBuilder"
import { toast } from "react-hot-toast"

interface FormEditClientProps {
  formId: string
}

export default function FormEditClient({ formId }: FormEditClientProps) {
  const [formData, setFormData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!formId) return

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

    fetchForm()
  }, [formId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading form...</div>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found</p>
      </div>
    )
  }

  return (
    <FormBuilder 
      formId={formId}
      initialData={{
        title: formData.title || '',
        description: formData.description || '',
        questions: Array.isArray(formData.questions) ? formData.questions : [],
        sections: Array.isArray(formData.sections) ? formData.sections : [],
        settings: formData.settings || {},
        status: formData.status || 'DRAFT',
      }}
    />
  )
}


