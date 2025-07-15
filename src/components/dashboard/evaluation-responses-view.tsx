"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Users, Star, MessageSquare, Download } from "lucide-react"

interface EvaluationResponsesViewProps {
  evaluationId: string
}

interface ResponseData {
  id: string
  student_name: string
  student_id: string
  submitted_at: string
  responses: Record<string, any>
}

interface EvaluationData {
  id: string
  title: string
  description: string | null
  questions: any[]
}

interface ResponseSummary {
  total_responses: number
  completion_rate: number
  average_rating: number
  question_stats: Record<string, any>
}

export function EvaluationResponsesView({ evaluationId }: EvaluationResponsesViewProps) {
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [summary, setSummary] = useState<ResponseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchEvaluationAndResponses()
  }, [evaluationId])

  const fetchEvaluationAndResponses = async () => {
    try {
      // Fetch evaluation details
      const evalResponse = await fetch(`/api/evaluations/${evaluationId}`)
      let evalData = null
      if (evalResponse.ok) {
        evalData = await evalResponse.json()
        setEvaluation(evalData)
      }

      // Fetch responses
      const responsesResponse = await fetch(`/api/evaluations/responses?evaluation_id=${evaluationId}`)
      if (responsesResponse.ok) {
        const responsesData = await responsesResponse.json()
        setResponses(responsesData.responses || [])
        
        // Calculate summary statistics
        calculateSummary(responsesData.responses || [], evalData?.questions || [])
      }
    } catch (error) {
      console.error('Error fetching evaluation responses:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (responsesData: ResponseData[], questions: any[]) => {
    const total = responsesData.length
    const questionStats: Record<string, any> = {}

    questions.forEach(question => {
      const questionResponses = responsesData.map(r => r.responses[question.id]).filter(Boolean)
      
      if (question.type === 'rating') {
        const ratings = questionResponses.map(r => Number(r)).filter(r => !isNaN(r))
        questionStats[question.id] = {
          type: 'rating',
          average: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
          responses: ratings.length,
          distribution: ratings.reduce((acc, rating) => {
            acc[rating] = (acc[rating] || 0) + 1
            return acc
          }, {} as Record<number, number>)
        }
      } else if (question.type === 'multiple_choice') {
        const choices = questionResponses.reduce((acc, choice) => {
          acc[choice] = (acc[choice] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        questionStats[question.id] = {
          type: 'multiple_choice',
          choices,
          responses: questionResponses.length
        }
      } else if (question.type === 'boolean') {
        const booleanResponses = questionResponses.reduce((acc, response) => {
          const key = response === true ? 'Yes' : 'No'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        questionStats[question.id] = {
          type: 'boolean',
          responses: booleanResponses,
          total: questionResponses.length
        }
      } else {
        questionStats[question.id] = {
          type: 'text',
          responses: questionResponses.length,
          answers: questionResponses
        }
      }
    })

    const ratingQuestions = questions.filter(q => q.type === 'rating')
    const averageRating = ratingQuestions.length > 0 
      ? ratingQuestions.reduce((sum, q) => sum + (questionStats[q.id]?.average || 0), 0) / ratingQuestions.length
      : 0

    setSummary({
      total_responses: total,
      completion_rate: 100, // Assuming all responses are complete
      average_rating: averageRating,
      question_stats: questionStats
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const exportResponses = async () => {
    try {
      // This would typically generate a CSV or Excel file
      console.log('Exporting responses...', responses)
      alert('Export functionality would be implemented here')
    } catch (error) {
      console.error('Error exporting responses:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading responses...</div>
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
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_responses || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.completion_rate || 0}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.average_rating ? summary.average_rating.toFixed(1) : 'N/A'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluation.questions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="responses">Individual Responses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <Button onClick={exportResponses} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Responses
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Overview</CardTitle>
              <CardDescription>{evaluation.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {evaluation.description || 'No description available'}
              </p>
              
              <div className="space-y-4">
                {evaluation.questions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Q{index + 1}. {question.question}</h4>
                      <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
                    </div>
                    
                    {summary?.question_stats[question.id] && (
                      <div className="mt-3">
                        {question.type === 'rating' && (
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Average: {summary.question_stats[question.id].average.toFixed(1)} 
                              ({summary.question_stats[question.id].responses} responses)
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(summary.question_stats[question.id].average / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {question.type === 'multiple_choice' && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {summary.question_stats[question.id].responses} responses
                            </p>
                            {Object.entries(summary.question_stats[question.id].choices).map(([choice, count]) => (
                              <div key={choice} className="flex justify-between items-center mb-1">
                                <span className="text-sm">{choice}</span>
                                <span className="text-sm font-medium">{String(count)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.type === 'boolean' && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {summary.question_stats[question.id].total} responses
                            </p>
                            {Object.entries(summary.question_stats[question.id].responses).map(([answer, count]) => (
                              <div key={answer} className="flex justify-between items-center mb-1">
                                <span className="text-sm">{answer}</span>
                                <span className="text-sm font-medium">{String(count)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.type === 'text' && (
                          <p className="text-sm text-muted-foreground">
                            {summary.question_stats[question.id].responses} text responses
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          {responses.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  No responses submitted yet
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <Card key={response.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {response.student_name} ({response.student_id})
                    </CardTitle>
                    <CardDescription>
                      Submitted on {formatDate(response.submitted_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {evaluation.questions.map((question, index) => (
                        <div key={question.id} className="border-l-2 border-gray-200 pl-4">
                          <p className="text-sm font-medium">Q{index + 1}. {question.question}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {response.responses[question.id] || 'No response'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Analytics</CardTitle>
              <CardDescription>
                Detailed analysis of evaluation responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Advanced analytics features would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 