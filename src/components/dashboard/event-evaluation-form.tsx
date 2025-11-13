"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, CheckCircle, ArrowLeft, Calendar, MapPin, Clock, AlertCircle } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import Link from "next/link"

interface EvaluationData {
  id: string
  title: string
  description: string | null
  questions: any[]
}

interface EventData {
  id: string
  title: string
  date: string
  location: string
  require_evaluation: boolean
}

interface EventEvaluationFormProps {
  eventId: string
  studentId: string | null
}

// Helper function to safely format date
const formatEventDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Date not available'
  
  try {
    const date = new Date(dateString)
    if (isValid(date)) {
      return format(date, 'PPP')
    }
    
    // Try parsing as ISO string
    const isoDate = parseISO(dateString)
    if (isValid(isoDate)) {
      return format(isoDate, 'PPP')
    }
    
    return 'Invalid date format'
  } catch (error) {
    console.error('Date formatting error:', error)
    return 'Date formatting error'
  }
}

export function EventEvaluationForm({ eventId, studentId }: EventEvaluationFormProps) {
  const router = useRouter()
  const [event, setEvent] = useState<EventData | null>(null)
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEventAndEvaluation = useCallback(async () => {
    if (!studentId) {
      setError("Student ID not available")
      setLoading(false)
      return
    }

    try {
      // Fetch event details first
      const eventResponse = await fetch(`/api/events/${eventId}`)
      if (!eventResponse.ok) {
        throw new Error('Event not found')
      }
      const eventData = await eventResponse.json()
      setEvent(eventData)

      // Check if event requires evaluation
      if (!eventData.require_evaluation || !eventData.evaluation_id) {
        setError('This event does not require an evaluation')
        setLoading(false)
        return
      }

      // Fetch the evaluation form for this event
      const evaluationResponse = await fetch(`/api/events/${eventId}/evaluation`)
      if (!evaluationResponse.ok) {
        setError('No evaluation found for this event')
        setLoading(false)
        return
      }
      const evalData = await evaluationResponse.json()
      setEvaluation(evalData)

      // Check if student has already submitted evaluation
      const responsesResponse = await fetch(`/api/forms/${evalData.id}/responses?student_id=${studentId}`)
      if (responsesResponse.ok) {
        const data = await responsesResponse.json()
        // Check if current user has submitted
        const hasSubmitted = data.responses && data.responses.some((r: any) => r.student_id === studentId)
        if (hasSubmitted) {
          setSubmitted(true)
          setLoading(false)
          return
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error)
      setError('Failed to load evaluation')
    } finally {
      setLoading(false)
    }
  }, [eventId, studentId])

  useEffect(() => {
    fetchEventAndEvaluation()
  }, [fetchEventAndEvaluation])

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleSubmit = async () => {
    if (!evaluation) return

    // Validate required questions
    const requiredQuestions = evaluation.questions.filter((q: any) => q.required)
    for (const question of requiredQuestions) {
      if (!responses[question.id] || responses[question.id] === '') {
        alert(`Please answer the required question: ${question.question}`)
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      // Fetch student UUID from student_id string
      const studentResponse = await fetch(`/api/students?student_id=${studentId}`)
      if (!studentResponse.ok) {
        throw new Error('Failed to fetch student information')
      }
      const studentData = await studentResponse.json()
      const studentUUID = studentData.students?.[0]?.id

      if (!studentUUID) {
        throw new Error('Student record not found')
      }

      const response = await fetch(`/api/forms/${evaluation.id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: responses,
          event_id: eventId,
          student_id: studentUUID, // Send the UUID, not the student_id string
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to submit evaluation')
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: any, index: number) => {
    const questionId = question.id

    switch (question.type) {
      case 'text':
        return (
          <div key={questionId} className="space-y-2">
            <Label htmlFor={questionId}>
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={questionId}
              placeholder="Enter your answer..."
              value={responses[questionId] || ''}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>
        )

      case 'multiple_choice':
        return (
          <div key={questionId} className="space-y-4">
            <Label>
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options?.map((option: string, optionIndex: number) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${questionId}_${optionIndex}`}
                    name={questionId}
                    value={option}
                    checked={responses[questionId] === option}
                    onChange={(e) => handleResponseChange(questionId, e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`${questionId}_${optionIndex}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'rating':
        const minRating = question.min_rating || 1
        const maxRating = question.max_rating || 5
        const currentRating = responses[questionId] || 0
        
        return (
          <div key={questionId} className="space-y-4">
            <Label>
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-2">
              {Array.from({ length: maxRating - minRating + 1 }, (_, i) => {
                const rating = minRating + i
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleResponseChange(questionId, rating)}
                    className={`p-2 rounded transition-colors ${
                      currentRating >= rating 
                        ? 'text-yellow-500' 
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                )
              })}
              <span className="ml-2 text-sm text-muted-foreground">
                {currentRating > 0 ? `${currentRating}/${maxRating}` : `Rate from ${minRating} to ${maxRating}`}
              </span>
            </div>
          </div>
        )

      case 'boolean':
        return (
          <div key={questionId} className="space-y-4">
            <Label>
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${questionId}_yes`}
                  name={questionId}
                  value="true"
                  checked={responses[questionId] === true}
                  onChange={(e) => handleResponseChange(questionId, e.target.value === 'true')}
                  className="h-4 w-4"
                />
                <Label htmlFor={`${questionId}_yes`} className="cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${questionId}_no`}
                  name={questionId}
                  value="false"
                  checked={responses[questionId] === false}
                  onChange={(e) => handleResponseChange(questionId, e.target.value === 'true')}
                  className="h-4 w-4"
                />
                <Label htmlFor={`${questionId}_no`} className="cursor-pointer">No</Label>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/certificates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Certificates
            </Link>
          </Button>
        </div>
        
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading evaluation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/certificates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Certificates
            </Link>
          </Button>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Evaluation Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for completing the evaluation. Your certificate is now available for download.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/dashboard">
                  Back to Dashboard
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/certificates">
                  View Certificates
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !event || !evaluation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/certificates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Certificates
            </Link>
          </Button>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'Failed to load evaluation'}
            </p>
            <Button asChild>
              <Link href="/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/certificates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Certificates
          </Link>
        </Button>
      </div>

      {/* Event Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event.title}
          </CardTitle>
          <CardDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatEventDate(event.date)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Evaluation Form */}
      <Card>
        <CardHeader>
          <CardTitle>{evaluation.title}</CardTitle>
          <CardDescription>
            {evaluation.description || "Please complete this evaluation to access your certificate."}
            <br />
            <span className="text-sm text-muted-foreground">
              Fields marked with * are required.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {evaluation.questions.map((question, index) => (
            <div key={question.id} className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  Question {index + 1}
                </Badge>
                {question.required && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
              {renderQuestion(question, index)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Complete all required questions to submit your evaluation.
            </p>
            
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Cancel
                </Link>
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Evaluation'}
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 