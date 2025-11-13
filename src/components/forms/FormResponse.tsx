"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { toast } from "react-hot-toast"
import { CheckCircle2 } from "lucide-react"

// Rating component to handle hover state
function RatingInput({ 
  max, 
  value, 
  icon, 
  onChange 
}: { 
  max: number
  value: number | undefined
  icon: string
  onChange: (rating: number) => void 
}) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)

  return (
    <div className="flex gap-2">
      {Array.from({ length: max }, (_, i) => {
        const ratingNum = i + 1
        const isActive = ratingNum <= (hoveredRating || value || 0)
        return (
          <button
            key={ratingNum}
            type="button"
            onClick={() => onChange(ratingNum)}
            onMouseEnter={() => setHoveredRating(ratingNum)}
            onMouseLeave={() => setHoveredRating(null)}
            className={`text-4xl transition-all hover:scale-125 ${
              isActive ? 'opacity-100' : 'opacity-20'
            }`}
          >
            {icon}
          </button>
        )
      })}
    </div>
  )
}

interface Question {
  id: string
  type: string
  question: string
  description?: string
  options?: string[]
  required: boolean
  min_value?: number
  max_value?: number
  min_label?: string
  max_label?: string
  rating_style?: 'star' | 'heart' | 'thumbs'
}

interface FormData {
  id: string
  title: string
  description: string | null
  questions: Question[]
  settings: {
    show_progress_bar?: boolean
    collect_email?: boolean
    require_login?: boolean
    confirmation_message?: string
  }
  status: string
}

interface FormResponseProps {
  formId: string
}

export function FormResponse({ formId }: FormResponseProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormData | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchForm = useCallback(async () => {
    try {
      const response = await fetch(`/api/forms/${formId}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Form not found')
        }
        throw new Error('Failed to fetch form')
      }
      
      const data = await response.json()
      
      if (data.status !== 'PUBLISHED') {
        toast.error('This form is not accepting responses')
        return
      }

      setForm(data)
    } catch (error) {
      console.error('Error fetching form:', error)
      toast.error('Failed to load form')
    } finally {
      setLoading(false)
    }
  }, [formId])

  useEffect(() => {
    fetchForm()
  }, [fetchForm])

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value })
    // Clear error for this question
    if (errors[questionId]) {
      const newErrors = { ...errors }
      delete newErrors[questionId]
      setErrors(newErrors)
    }
  }

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const currentAnswers = answers[questionId] || []
    const newAnswers = checked
      ? [...currentAnswers, option]
      : currentAnswers.filter((a: string) => a !== option)
    handleAnswerChange(questionId, newAnswers)
  }

  const validateForm = (): boolean => {
    if (!form) return false

    const newErrors: Record<string, string> = {}
    
    form.questions.forEach((question) => {
      if (question.required) {
        const answer = answers[question.id]
        if (answer === undefined || answer === null || answer === '' || 
            (Array.isArray(answer) && answer.length === 0)) {
          newErrors[question.id] = 'This question is required'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!form) return

    if (!validateForm()) {
      toast.error('Please answer all required questions')
      // Scroll to first error
      const firstError = Object.keys(errors)[0]
      const element = document.getElementById(`question-${firstError}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/forms/${formId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit response')
      }

      const data = await response.json()
      setConfirmationMessage(data.message || form.settings.confirmation_message || 'Thank you for your response!')
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: Question) => {
    const error = errors[question.id]

    switch (question.type) {
      case 'short_answer':
      case 'email':
        return (
          <div>
            <Input
              type={question.type === 'email' ? 'email' : 'text'}
              placeholder="Your answer"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'paragraph':
        return (
          <div>
            <Textarea
              placeholder="Your answer"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              rows={4}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'multiple_choice':
        return (
          <div>
            <RadioGroup
              value={answers[question.id] || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                  <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={(answers[question.id] || []).includes(option)}
                  onCheckedChange={(checked) => handleCheckboxChange(question.id, option, checked as boolean)}
                />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'dropdown':
        return (
          <div>
            <select
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : ''}`}
            >
              <option value="">Select an option</option>
              {question.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'linear_scale':
        const min = question.min_value || 1
        const max = question.max_value || 5
        const selectedValue = answers[question.id]

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{question.min_label}</span>
              <span>{question.max_label}</span>
            </div>
            <div className="flex gap-2 justify-between">
              {Array.from({ length: max - min + 1 }, (_, i) => {
                const value = min + i
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={selectedValue === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAnswerChange(question.id, value)}
                    className="flex-1"
                  >
                    {value}
                  </Button>
                )
              })}
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'rating':
        const ratingMax = question.max_value || 5
        const ratingValue = answers[question.id]
        const ratingIcon = question.rating_style === 'heart' ? '❤️' : question.rating_style === 'thumbs' ? '👍' : '⭐'

        return (
          <div className="space-y-3">
            <RatingInput
              max={ratingMax}
              value={ratingValue}
              icon={ratingIcon}
              onChange={(rating) => handleAnswerChange(question.id, rating)}
            />
            {ratingValue && (
              <p className="text-sm text-muted-foreground">
                You selected: {ratingValue} / {ratingMax}
              </p>
            )}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'date':
        return (
          <div>
            <Input
              type="date"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      case 'time':
        return (
          <div>
            <Input
              type="time"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading form...</div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found or not available</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Response Submitted!</h2>
            <p className="text-muted-foreground">{confirmationMessage}</p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = form.settings.show_progress_bar && form.questions.length > 0
    ? (Object.keys(answers).length / form.questions.length) * 100
    : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8">
      {/* Form Header */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="text-3xl">{form.title}</CardTitle>
          {form.description && (
            <CardDescription className="text-white/90 text-base">
              {form.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Progress Bar */}
      {form.settings.show_progress_bar && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {form.questions.map((question, index) => (
        <Card key={question.id} id={`question-${question.id}`}>
          <CardHeader>
            <Label className="text-base">
              {index + 1}. {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
          </CardHeader>
          <CardContent>{renderQuestion(question)}</CardContent>
        </Card>
      ))}

      {/* Submit Button */}
      <Card>
        <CardFooter className="pt-6 flex justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

