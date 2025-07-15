"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, GripVertical, Star } from "lucide-react"
import { EvaluationQuestion } from "@/lib/supabase"

interface EvaluationFormProps {
  evaluationId?: string
  onSave?: (evaluationId: string) => void
  onCancel?: () => void
}

interface QuestionFormData extends Omit<EvaluationQuestion, 'id'> {
  id: string
  tempId?: string // For new questions before saving
}

export default function EvaluationForm({ evaluationId, onSave, onCancel }: EvaluationFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<QuestionFormData[]>([])
  const [isTemplate, setIsTemplate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!evaluationId)

  // Load existing evaluation if editing
  useEffect(() => {
    if (evaluationId) {
      fetchEvaluation()
    }
  }, [evaluationId])

  const fetchEvaluation = async () => {
    try {
      const response = await fetch(`/api/evaluations/${evaluationId}`)
      if (response.ok) {
        const data = await response.json()
        setTitle(data.title)
        setDescription(data.description || "")
        setQuestions(data.questions)
        setIsTemplate(data.is_template)
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const addQuestion = () => {
    const newQuestion: QuestionFormData = {
      id: `temp_${Date.now()}`,
      tempId: `temp_${Date.now()}`,
      type: 'text',
      question: '',
      required: true,
      options: [],
    }
    setQuestions(prev => [...prev, newQuestion])
  }

  const updateQuestion = (index: number, updates: Partial<QuestionFormData>) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q))
  }

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const addOption = (questionIndex: number) => {
    updateQuestion(questionIndex, {
      options: [...(questions[questionIndex].options || []), '']
    })
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const currentOptions = [...(questions[questionIndex].options || [])]
    currentOptions[optionIndex] = value
    updateQuestion(questionIndex, { options: currentOptions })
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = [...(questions[questionIndex].options || [])]
    currentOptions.splice(optionIndex, 1)
    updateQuestion(questionIndex, { options: currentOptions })
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for the evaluation')
      return
    }

    if (questions.length === 0) {
      alert('Please add at least one question')
      return
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.question.trim()) {
        alert(`Please enter text for question ${i + 1}`)
        return
      }

      if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
        alert(`Question ${i + 1}: Multiple choice questions must have at least 2 options`)
        return
      }

      if (question.type === 'rating' && (!question.min_rating || !question.max_rating || question.min_rating >= question.max_rating)) {
        alert(`Question ${i + 1}: Rating questions must have valid min and max values`)
        return
      }
    }

    setLoading(true)

    try {
      // Clean up questions data - ensure proper IDs
      const cleanedQuestions = questions.map((q, index) => ({
        id: q.tempId || q.id || `q_${index}`,
        type: q.type,
        question: q.question.trim(),
        options: q.type === 'multiple_choice' ? q.options?.filter(opt => opt.trim()) : undefined,
        required: q.required,
        min_rating: q.type === 'rating' ? q.min_rating : undefined,
        max_rating: q.type === 'rating' ? q.max_rating : undefined,
      }))

      const evaluationData = {
        title: title.trim(),
        description: description.trim() || null,
        questions: cleanedQuestions,
        is_template: isTemplate,
      }

      const url = evaluationId ? `/api/evaluations/${evaluationId}` : '/api/evaluations'
      const method = evaluationId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationData),
      })

      if (response.ok) {
        const result = await response.json()
        if (onSave) {
          onSave(result.id)
        }
      } else {
        const error = await response.json()
        alert(`Error saving evaluation: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving evaluation:', error)
      alert('Error saving evaluation')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading evaluation...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Set the title and description for your evaluation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Workshop Feedback Survey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of what this evaluation is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="template"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="template">Save as template for future use</Label>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>
                Add questions to your evaluation. Drag to reorder.
              </CardDescription>
            </div>
            <Button onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No questions added yet. Click "Add Question" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, questionIndex) => (
                <Card key={question.id} className="p-4">
                  <div className="space-y-4">
                    {/* Question Header */}
                    <div className="flex items-start gap-4">
                      <div className="mt-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">Q{questionIndex + 1}</Badge>
                          <Select
                            value={question.type}
                            onValueChange={(value: any) => updateQuestion(questionIndex, { type: value })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Open Text</SelectItem>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="rating">Rating Scale</SelectItem>
                              <SelectItem value="boolean">Yes/No</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => updateQuestion(questionIndex, { required: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <Label className="text-sm">Required</Label>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div>
                          <Input
                            placeholder="Enter your question..."
                            value={question.question}
                            onChange={(e) => updateQuestion(questionIndex, { question: e.target.value })}
                          />
                        </div>

                        {/* Question Type Specific Options */}
                        {question.type === 'multiple_choice' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Options</Label>
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <Input
                                  placeholder={`Option ${optionIndex + 1}`}
                                  value={option}
                                  onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(questionIndex, optionIndex)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(questionIndex)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Option
                            </Button>
                          </div>
                        )}

                        {question.type === 'rating' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm">Min Rating</Label>
                              <Input
                                type="number"
                                min="1"
                                value={question.min_rating || 1}
                                onChange={(e) => updateQuestion(questionIndex, { min_rating: parseInt(e.target.value) })}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Max Rating</Label>
                              <Input
                                type="number"
                                min="2"
                                value={question.max_rating || 5}
                                onChange={(e) => updateQuestion(questionIndex, { max_rating: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : evaluationId ? 'Update Evaluation' : 'Create Evaluation'}
        </Button>
      </div>
    </div>
  )
} 