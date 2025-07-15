"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Copy, Users } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Evaluation {
  id: string
  title: string
  description: string | null
  questions: any[]
  is_template: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  creator?: {
    id: string
    name: string
    email: string
  }
}

export function EvaluationsTable() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const fetchEvaluations = async () => {
    try {
      const response = await fetch(
        `/api/evaluations?page=${page}&limit=${limit}&search=${searchTerm}&templates_only=true`
      )
      if (response.ok) {
        const data = await response.json()
        setEvaluations(data.evaluations)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (evaluationId: string) => {
    try {
      const response = await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setEvaluations(prev => prev.filter(e => e.id !== evaluationId))
        setTotal(prev => prev - 1)
      } else {
        const data = await response.json()
        alert(`Error deleting evaluation: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error)
      alert('Error deleting evaluation')
    }
  }

  const handleDuplicate = async (evaluation: Evaluation) => {
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${evaluation.title} (Copy)`,
          description: evaluation.description,
          questions: evaluation.questions,
          is_template: true,
        }),
      })

      if (response.ok) {
        fetchEvaluations() // Refresh the list
      } else {
        const data = await response.json()
        alert(`Error duplicating evaluation: ${data.error}`)
      }
    } catch (error) {
      console.error('Error duplicating evaluation:', error)
      alert('Error duplicating evaluation')
    }
  }

  const getQuestionTypeCounts = (questions: any[]) => {
    const counts = {
      multiple_choice: 0,
      rating: 0,
      text: 0,
      boolean: 0,
    }

    questions.forEach(q => {
      if (counts.hasOwnProperty(q.type)) {
        counts[q.type as keyof typeof counts]++
      }
    })

    return counts
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  useEffect(() => {
    fetchEvaluations()
  }, [page, searchTerm])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading evaluations...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search evaluations..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1) // Reset to first page when searching
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluations.filter(e => e.is_template).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evaluations.filter(e => {
                const created = new Date(e.created_at)
                const now = new Date()
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations List */}
      {evaluations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">
                No evaluations found. Create your first evaluation template to get started.
              </div>
              <Link href="/dashboard/evaluations/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Evaluation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {evaluations.map((evaluation) => {
            const questionCounts = getQuestionTypeCounts(evaluation.questions)
            const totalQuestions = evaluation.questions.length

            return (
              <Card key={evaluation.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{evaluation.title}</CardTitle>
                      {evaluation.description && (
                        <CardDescription className="text-sm">
                          {evaluation.description}
                        </CardDescription>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">
                          {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
                        </Badge>
                        {questionCounts.multiple_choice > 0 && (
                          <Badge variant="outline">
                            {questionCounts.multiple_choice} Multiple Choice
                          </Badge>
                        )}
                        {questionCounts.rating > 0 && (
                          <Badge variant="outline">
                            {questionCounts.rating} Rating
                          </Badge>
                        )}
                        {questionCounts.text > 0 && (
                          <Badge variant="outline">
                            {questionCounts.text} Open Text
                          </Badge>
                        )}
                        {questionCounts.boolean > 0 && (
                          <Badge variant="outline">
                            {questionCounts.boolean} Yes/No
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(evaluation)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Link href={`/dashboard/evaluations/${evaluation.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Evaluation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{evaluation.title}"? 
                              This action cannot be undone and will prevent it from being used in new events.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(evaluation.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div>
                      Created by {evaluation.creator?.name || 'Unknown'} on {formatDate(evaluation.created_at)}
                    </div>
                    <div className="flex items-center gap-4">
                      <Link href={`/dashboard/evaluations/${evaluation.id}/responses`}>
                        <Button variant="ghost" size="sm">
                          <Users className="h-4 w-4 mr-1" />
                          View Responses
                        </Button>
                      </Link>
                      <Link href={`/dashboard/evaluations/${evaluation.id}/preview`}>
                        <Button variant="outline" size="sm">
                          Preview
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(prev => prev + 1)}
            disabled={page >= Math.ceil(total / limit)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
} 