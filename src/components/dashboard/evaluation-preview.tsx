"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Eye, FileText } from "lucide-react"

interface EvaluationPreviewProps {
  evaluationId: string
}

interface EvaluationData {
  id: string
  title: string
  description: string | null
  questions: any[]
  is_template: boolean
  created_at: string
  updated_at: string
}

export function EvaluationPreview({ evaluationId }: EvaluationPreviewProps) {
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvaluation()
  }, [evaluationId])

  const fetchEvaluation = async () => {
    try {
      const response = await fetch(`/api/evaluations/${evaluationId}`)
      if (response.ok) {
        const data = await response.json()
        setEvaluation(data)
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderPreviewQuestion = (question: any, index: number) => {
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
              disabled
              rows={4}
              className="bg-gray-50"
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
                    disabled
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`${questionId}_${optionIndex}`} className="text-gray-600">
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
                    disabled
                    className="p-2 rounded transition-colors text-gray-300"
                  >
                    <Star className="h-6 w-6" />
                  </button>
                )
              })}
              <span className="ml-2 text-sm text-muted-foreground">
                Rate from {minRating} to {maxRating}
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
                  disabled
                  className="h-4 w-4"
                />
                <Label htmlFor={`${questionId}_yes`} className="text-gray-600">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${questionId}_no`}
                  name={questionId}
                  value="false"
                  disabled
                  className="h-4 w-4"
                />
                <Label htmlFor={`${questionId}_no`} className="text-gray-600">No</Label>
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
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading evaluation...</div>
      </div>
    )
  }

  if (!evaluation) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Evaluation not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Preview Mode</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            This is how the evaluation will appear to students. All fields are disabled in preview mode.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Evaluation Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl mb-2">{evaluation.title}</CardTitle>
              {evaluation.description && (
                <CardDescription className="text-base">
                  {evaluation.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {evaluation.questions.length} Question{evaluation.questions.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline">
                {evaluation.is_template ? 'Template' : 'Active'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Evaluation Form Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Evaluation Questions
          </CardTitle>
          <CardDescription>
            Preview of all questions in this evaluation. 
            Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {evaluation.questions.map((question, index) => (
            <div key={question.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                <Badge variant="outline" className="text-xs">
                  {question.type.replace('_', ' ')}
                </Badge>
              </div>
              {renderPreviewQuestion(question, index)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview Actions */}
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-end gap-4">
            <Button variant="outline" disabled>
              Cancel
            </Button>
            <Button disabled>
              Submit Evaluation
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Actions are disabled in preview mode
          </p>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Evaluation ID:</span> {evaluation.id}
            </div>
            <div>
              <span className="font-medium">Created:</span> {new Date(evaluation.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date(evaluation.updated_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Status:</span> {evaluation.is_template ? 'Template' : 'Active'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 