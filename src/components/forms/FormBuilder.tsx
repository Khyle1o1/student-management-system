"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Eye, 
  Save, 
  Settings, 
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  LayoutList
} from "lucide-react"
import { toast } from "react-hot-toast"

interface Section {
  id: string
  title: string
  description?: string
  order: number
}

interface Question {
  id: string
  sectionId?: string
  type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'linear_scale' | 'dropdown' | 'date' | 'time' | 'email' | 'rating'
  question: string
  description?: string
  options?: string[]
  required: boolean
  order: number
  min_value?: number
  max_value?: number
  min_label?: string
  max_label?: string
  rating_style?: 'star' | 'heart' | 'thumbs'
}

interface FormSettings {
  allow_multiple_submissions?: boolean
  show_progress_bar?: boolean
  shuffle_questions?: boolean
  collect_email?: boolean
  require_login?: boolean
  send_confirmation?: boolean
  confirmation_message?: string
}

interface FormBuilderProps {
  formId?: string
  initialData?: {
    title: string
    description?: string
    questions: Question[]
    sections?: Section[]
    settings?: FormSettings
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  }
  onSave?: (formId: string) => void
  onCancel?: () => void
}

const QUESTION_TYPES = [
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'linear_scale', label: 'Linear Scale' },
  { value: 'rating', label: 'Rating (Star/Heart/Thumbs)' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'email', label: 'Email' },
]

export function FormBuilder({ formId, initialData, onSave, onCancel }: FormBuilderProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [sections, setSections] = useState<Section[]>(initialData?.sections || [])
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || [])
  const [settings, setSettings] = useState<FormSettings>(initialData?.settings || {
    allow_multiple_submissions: false,
    show_progress_bar: true,
    shuffle_questions: false,
    collect_email: true,
    require_login: false,
    send_confirmation: false,
  })
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'CLOSED'>(initialData?.status || 'DRAFT')
  const [showSettings, setShowSettings] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Section management functions
  const addSection = () => {
    const newSection: Section = {
      id: `s_${Date.now()}`,
      title: '',
      description: '',
      order: sections.length,
    }
    setSections([...sections, newSection])
    setExpandedSection(newSection.id)
  }

  const updateSection = (id: string, updates: Partial<Section>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const deleteSection = (id: string) => {
    // Remove section
    setSections(sections.filter(s => s.id !== id).map((s, index) => ({ ...s, order: index })))
    // Remove sectionId from questions in this section
    setQuestions(questions.map(q => q.sectionId === id ? { ...q, sectionId: undefined } : q))
  }

  const addQuestion = (type: Question['type'] = 'short_answer', sectionId?: string) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      sectionId,
      type,
      question: '',
      required: false,
      order: questions.length,
      ...(type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown' ? { options: ['Option 1'] } : {}),
      ...(type === 'linear_scale' ? { min_value: 1, max_value: 5, min_label: 'Low', max_label: 'High' } : {}),
      ...(type === 'rating' ? { rating_style: 'star', max_value: 5 } : {}),
    }
    setQuestions([...questions, newQuestion])
    setExpandedQuestion(newQuestion.id)
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        const updatedQuestion = { ...q, ...updates }
        
        // When changing to multiple_choice, checkbox, or dropdown, initialize options if not present
        if (updates.type && ['multiple_choice', 'checkbox', 'dropdown'].includes(updates.type)) {
          if (!updatedQuestion.options || updatedQuestion.options.length === 0) {
            updatedQuestion.options = ['Option 1', 'Option 2']
          }
        }
        
        // When changing to linear_scale, initialize min/max if not present
        if (updates.type === 'linear_scale') {
          if (!updatedQuestion.min_value) updatedQuestion.min_value = 1
          if (!updatedQuestion.max_value) updatedQuestion.max_value = 5
          if (!updatedQuestion.min_label) updatedQuestion.min_label = 'Low'
          if (!updatedQuestion.max_label) updatedQuestion.max_label = 'High'
        }
        
        // When changing to rating, initialize default style and max
        if (updates.type === 'rating') {
          if (!updatedQuestion.rating_style) updatedQuestion.rating_style = 'star'
          if (!updatedQuestion.max_value) updatedQuestion.max_value = 5
        }
        
        return updatedQuestion
      }
      return q
    }))
  }

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id).map((q, index) => ({ ...q, order: index })))
  }

  const duplicateQuestion = (id: string) => {
    const questionToDuplicate = questions.find(q => q.id === id)
    if (questionToDuplicate) {
      const newQuestion = {
        ...questionToDuplicate,
        id: `q_${Date.now()}`,
        order: questions.length,
      }
      setQuestions([...questions, newQuestion])
    }
  }

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === id)
    if (index === -1) return
    
    if (direction === 'up' && index > 0) {
      const newQuestions = [...questions]
      ;[newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]]
      setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })))
    } else if (direction === 'down' && index < questions.length - 1) {
      const newQuestions = [...questions]
      ;[newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]]
      setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })))
    }
  }

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId)
    if (question && question.options) {
      updateQuestion(questionId, {
        options: [...question.options, `Option ${question.options.length + 1}`]
      })
    }
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId)
    if (question && question.options) {
      const newOptions = [...question.options]
      newOptions[optionIndex] = value
      updateQuestion(questionId, { options: newOptions })
    }
  }

  const deleteOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId)
    if (question && question.options && question.options.length > 1) {
      updateQuestion(questionId, {
        options: question.options.filter((_, i) => i !== optionIndex)
      })
    }
  }

  const handleSave = async (publishNow: boolean = false) => {
    if (!title.trim()) {
      toast.error('Please enter a form title')
      return
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question')
      return
    }

    // Validate questions
    for (const question of questions) {
      if (!question.question.trim()) {
        toast.error('All questions must have text')
        return
      }
      if (['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && (!question.options || question.options.length === 0)) {
        toast.error(`Question "${question.question}" must have at least one option`)
        return
      }
    }

    setSaving(true)
    try {
      const formData = {
        title,
        description,
        sections: sections.map((s, i) => ({ ...s, order: i })),
        questions: questions.map((q, i) => ({ ...q, order: i })),
        settings,
        status: publishNow ? 'PUBLISHED' : status,
      }

      const url = formId ? `/api/forms/${formId}` : '/api/forms'
      const method = formId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save form')
      }

      const savedForm = await response.json()
      toast.success(publishNow ? 'Form published successfully!' : 'Form saved successfully!')
      
      if (onSave) {
        onSave(savedForm.id)
      } else {
        router.push('/dashboard/forms')
      }
    } catch (error) {
      console.error('Error saving form:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  if (previewMode) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Preview Mode</h2>
          <Button onClick={() => setPreviewMode(false)} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Close Preview
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title || 'Untitled Form'}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <Label>
                  {index + 1}. {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {question.description && (
                  <p className="text-sm text-muted-foreground">{question.description}</p>
                )}
                {renderPreviewQuestion(question)}
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button disabled>Submit (Preview Only)</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <Input
            placeholder="Form Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold border-none px-0 focus-visible:ring-0"
          />
          <Textarea
            placeholder="Form description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border-none px-0 resize-none focus-visible:ring-0"
            rows={2}
          />
        </CardHeader>
      </Card>

      {/* Sections and Questions */}
      {sections.length === 0 && questions.filter(q => !q.sectionId).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <LayoutList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No questions or sections yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding a question or create a section to organize your form
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => addQuestion()} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
              <Button onClick={addSection} variant="outline">
                <LayoutList className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Questions without section (default section) */}
          {questions.filter(q => !q.sectionId).map((question, index) => (
            <Card key={question.id} className={expandedQuestion === question.id ? "border-blue-500" : ""}>
              <CardHeader>
                <div className="flex items-start gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Question {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => duplicateQuestion(question.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Input
                          placeholder="Question"
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <Select
                          value={question.type}
                          onValueChange={(value) => updateQuestion(question.id, { type: value as Question['type'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`required-${question.id}`}
                          checked={question.required}
                          onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                        />
                        <Label htmlFor={`required-${question.id}`}>Required</Label>
                      </div>
                    </div>

                    <Input
                      placeholder="Description (optional)"
                      value={question.description || ''}
                      onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
                      className="text-sm"
                    />

                    {/* Question-specific options */}
                    {['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && question.options && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteOption(question.id, optionIndex)}
                              disabled={question.options!.length <= 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addOption(question.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    {question.type === 'linear_scale' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Min Value</Label>
                          <Input
                            type="number"
                            value={question.min_value}
                            onChange={(e) => updateQuestion(question.id, { min_value: parseInt(e.target.value) })}
                          />
                          <Input
                            placeholder="Min label"
                            value={question.min_label}
                            onChange={(e) => updateQuestion(question.id, { min_label: e.target.value })}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Max Value</Label>
                          <Input
                            type="number"
                            value={question.max_value}
                            onChange={(e) => updateQuestion(question.id, { max_value: parseInt(e.target.value) })}
                          />
                          <Input
                            placeholder="Max label"
                            value={question.max_label}
                            onChange={(e) => updateQuestion(question.id, { max_label: e.target.value })}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}

                    {question.type === 'rating' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Rating Style</Label>
                            <Select
                              value={question.rating_style || 'star'}
                              onValueChange={(value) => updateQuestion(question.id, { rating_style: value as 'star' | 'heart' | 'thumbs' })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="star">⭐ Star</SelectItem>
                                <SelectItem value="heart">❤️ Heart</SelectItem>
                                <SelectItem value="thumbs">👍 Thumbs Up</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Number of {question.rating_style === 'star' ? 'Stars' : question.rating_style === 'heart' ? 'Hearts' : 'Thumbs'}</Label>
                            <Select
                              value={question.max_value?.toString() || '5'}
                              onValueChange={(value) => updateQuestion(question.id, { max_value: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                          <div className="flex gap-1">
                            {Array.from({ length: question.max_value || 5 }, (_, i) => (
                              <span key={i} className="text-2xl opacity-30">
                                {question.rating_style === 'heart' ? '❤️' : question.rating_style === 'thumbs' ? '👍' : '⭐'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {/* Sections */}
          {sections.map((section, sectionIndex) => {
            const sectionQuestions = questions.filter(q => q.sectionId === section.id)
            return (
              <div key={section.id} className="space-y-4">
                {/* Section Header */}
                <Card className={`bg-gradient-to-r from-purple-50 to-blue-50 ${expandedSection === section.id ? "border-purple-500" : ""}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <LayoutList className="h-6 w-6 text-purple-600 mt-1" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-white">
                            Section {sectionIndex + 1}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        
                        <Input
                          placeholder="Section Title"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="text-xl font-bold bg-white"
                        />
                        
                        <Textarea
                          placeholder="Section Description (optional)"
                          value={section.description || ''}
                          onChange={(e) => updateSection(section.id, { description: e.target.value })}
                          className="text-sm bg-white resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Questions in this section */}
                {sectionQuestions.map((question, qIndex) => (
                  <Card key={question.id} className={`ml-4 ${expandedQuestion === question.id ? "border-blue-500" : ""}`}>
                    <CardHeader>
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Question {qIndex + 1}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => duplicateQuestion(question.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteQuestion(question.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <Input
                                placeholder="Question"
                                value={question.question}
                                onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                              />
                            </div>
                            
                            <div>
                              <Select
                                value={question.type}
                                onValueChange={(value) => updateQuestion(question.id, { type: value as Question['type'] })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {QUESTION_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`required-${question.id}`}
                                checked={question.required}
                                onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                              />
                              <Label htmlFor={`required-${question.id}`}>Required</Label>
                            </div>
                          </div>

                          <Input
                            placeholder="Description (optional)"
                            value={question.description || ''}
                            onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
                            className="text-sm"
                          />

                          {/* Question-specific options (same as above) */}
                          {['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && question.options && (
                            <div className="space-y-2">
                              <Label>Options</Label>
                              {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                    placeholder={`Option ${optionIndex + 1}`}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteOption(question.id, optionIndex)}
                                    disabled={question.options!.length <= 1}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addOption(question.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Option
                              </Button>
                            </div>
                          )}

                          {question.type === 'linear_scale' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Min Value</Label>
                                <Input
                                  type="number"
                                  value={question.min_value}
                                  onChange={(e) => updateQuestion(question.id, { min_value: parseInt(e.target.value) })}
                                />
                                <Input
                                  placeholder="Min label"
                                  value={question.min_label}
                                  onChange={(e) => updateQuestion(question.id, { min_label: e.target.value })}
                                  className="mt-2"
                                />
                              </div>
                              <div>
                                <Label>Max Value</Label>
                                <Input
                                  type="number"
                                  value={question.max_value}
                                  onChange={(e) => updateQuestion(question.id, { max_value: parseInt(e.target.value) })}
                                />
                                <Input
                                  placeholder="Max label"
                                  value={question.max_label}
                                  onChange={(e) => updateQuestion(question.id, { max_label: e.target.value })}
                                  className="mt-2"
                                />
                              </div>
                            </div>
                          )}

                          {question.type === 'rating' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Rating Style</Label>
                                  <Select
                                    value={question.rating_style || 'star'}
                                    onValueChange={(value) => updateQuestion(question.id, { rating_style: value as 'star' | 'heart' | 'thumbs' })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="star">⭐ Star</SelectItem>
                                      <SelectItem value="heart">❤️ Heart</SelectItem>
                                      <SelectItem value="thumbs">👍 Thumbs Up</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Number of {question.rating_style === 'star' ? 'Stars' : question.rating_style === 'heart' ? 'Hearts' : 'Thumbs'}</Label>
                                  <Select
                                    value={question.max_value?.toString() || '5'}
                                    onValueChange={(value) => updateQuestion(question.id, { max_value: parseInt(value) })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="3">3</SelectItem>
                                      <SelectItem value="5">5</SelectItem>
                                      <SelectItem value="10">10</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                                <div className="flex gap-1">
                                  {Array.from({ length: question.max_value || 5 }, (_, i) => (
                                    <span key={i} className="text-2xl opacity-30">
                                      {question.rating_style === 'heart' ? '❤️' : question.rating_style === 'thumbs' ? '👍' : '⭐'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}

                {/* Add Question to Section */}
                <Card className="ml-4 border-dashed">
                  <CardContent className="py-4">
                    <Button onClick={() => addQuestion('short_answer', section.id)} variant="outline" className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question to Section
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )
          })}

          {/* Add Question/Section Buttons */}
          <Card className="border-dashed">
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button onClick={() => addQuestion()} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
                <Button onClick={addSection} variant="outline" className="w-full">
                  <LayoutList className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-multiple">Allow multiple submissions</Label>
              <Switch
                id="allow-multiple"
                checked={settings.allow_multiple_submissions}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_multiple_submissions: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-progress">Show progress bar</Label>
              <Switch
                id="show-progress"
                checked={settings.show_progress_bar}
                onCheckedChange={(checked) => setSettings({ ...settings, show_progress_bar: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="shuffle">Shuffle questions</Label>
              <Switch
                id="shuffle"
                checked={settings.shuffle_questions}
                onCheckedChange={(checked) => setSettings({ ...settings, shuffle_questions: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="collect-email">Collect email addresses</Label>
              <Switch
                id="collect-email"
                checked={settings.collect_email}
                onCheckedChange={(checked) => setSettings({ ...settings, collect_email: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require-login">Require login</Label>
              <Switch
                id="require-login"
                checked={settings.require_login}
                onCheckedChange={(checked) => setSettings({ ...settings, require_login: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="send-confirmation">Send confirmation email</Label>
              <Switch
                id="send-confirmation"
                checked={settings.send_confirmation}
                onCheckedChange={(checked) => setSettings({ ...settings, send_confirmation: checked })}
              />
            </div>
            {settings.send_confirmation && (
              <div>
                <Label htmlFor="confirmation-message">Confirmation Message</Label>
                <Textarea
                  id="confirmation-message"
                  value={settings.confirmation_message || ''}
                  onChange={(e) => setSettings({ ...settings, confirmation_message: e.target.value })}
                  placeholder="Thank you for your response!"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4">
        <div className="max-w-5xl mx-auto flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel || (() => router.push('/dashboard/forms'))}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderPreviewQuestion(question: Question) {
  switch (question.type) {
    case 'short_answer':
    case 'email':
      return <Input placeholder="Your answer" disabled />
    
    case 'paragraph':
      return <Textarea placeholder="Your answer" disabled rows={4} />
    
    case 'multiple_choice':
    case 'dropdown':
      return (
        <div className="space-y-2">
          {question.options?.map((option, i) => (
            <div key={i} className="flex items-center space-x-2">
              <input type="radio" disabled />
              <Label>{option}</Label>
            </div>
          ))}
        </div>
      )
    
    case 'checkbox':
      return (
        <div className="space-y-2">
          {question.options?.map((option, i) => (
            <div key={i} className="flex items-center space-x-2">
              <input type="checkbox" disabled />
              <Label>{option}</Label>
            </div>
          ))}
        </div>
      )
    
    case 'linear_scale':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{question.min_label}</span>
            <span>{question.max_label}</span>
          </div>
          <div className="flex gap-2 justify-between">
            {Array.from({ length: (question.max_value || 5) - (question.min_value || 1) + 1 }, (_, i) => (
              <Button key={i} variant="outline" size="sm" disabled>
                {(question.min_value || 1) + i}
              </Button>
            ))}
          </div>
        </div>
      )
    
    case 'rating':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {Array.from({ length: question.max_value || 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                className="text-3xl transition-all hover:scale-110 opacity-30 hover:opacity-100"
                disabled
              >
                {question.rating_style === 'heart' ? '❤️' : question.rating_style === 'thumbs' ? '👍' : '⭐'}
              </button>
            ))}
          </div>
        </div>
      )
    
    case 'date':
      return <Input type="date" disabled />
    
    case 'time':
      return <Input type="time" disabled />
    
    default:
      return null
  }
}

