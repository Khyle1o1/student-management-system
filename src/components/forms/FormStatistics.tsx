"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { 
  Download, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowLeft,
  FileText,
  BarChart3
} from "lucide-react"
import { toast } from "react-hot-toast"
import { format } from "date-fns"

interface QuestionStatistic {
  question_id: string
  question_type: string
  question_text: string
  total_responses: number
  statistics: any
}

interface Statistics {
  form_id: string
  form_title: string
  total_responses: number
  completion_rate: number
  question_statistics: QuestionStatistic[]
  time_statistics: {
    first_response: string
    latest_response: string
    average_daily_responses: number
  } | null
  generated_at: string
}

interface FormStatisticsProps {
  formId: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D']

export function FormStatistics({ formId }: FormStatisticsProps) {
  const router = useRouter()
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [formId])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/forms/${formId}/statistics`)
      if (!response.ok) throw new Error('Failed to fetch statistics')
      
      const data = await response.json()
      setStatistics(data)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setExporting(true)
    try {
      const response = await fetch(`/api/forms/${formId}/export?format=${format}`)
      if (!response.ok) throw new Error('Failed to export data')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const extension = format === 'pdf' ? 'pdf' : format
      a.download = format === 'pdf' 
        ? `form_statistics_${formId}.${extension}`
        : `form_responses_${formId}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Data exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const renderQuestionStatistics = (questionStat: QuestionStatistic) => {
    const { question_type, question_text, statistics } = questionStat

    switch (question_type) {
      case 'multiple_choice':
      case 'dropdown':
        return renderMultipleChoiceStats(questionStat)

      case 'checkbox':
        return renderCheckboxStats(questionStat)

      case 'linear_scale':
        return renderLinearScaleStats(questionStat)

      case 'rating':
        return renderRatingStats(questionStat)

      case 'short_answer':
      case 'paragraph':
      case 'email':
        return renderTextStats(questionStat)

      default:
        return (
          <div className="text-sm text-muted-foreground">
            Statistics not available for this question type
          </div>
        )
    }
  }

  const renderMultipleChoiceStats = (questionStat: QuestionStatistic) => {
    const { statistics } = questionStat
    
    if (!statistics.options || statistics.options.length === 0) {
      return <p className="text-sm text-muted-foreground">No responses yet</p>
    }

    // Prepare data for pie chart
    const pieData = statistics.options.map((opt: any) => ({
      name: opt.option,
      value: opt.count,
      percentage: opt.percentage,
    }))

    // Prepare data for bar chart
    const barData = statistics.options.map((opt: any) => ({
      option: opt.option.length > 20 ? opt.option.substring(0, 20) + '...' : opt.option,
      count: opt.count,
    }))

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Response Count</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="option" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
        <div>
          <h4 className="text-sm font-medium mb-2">Summary</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Option</th>
                  <th className="text-right p-3">Count</th>
                  <th className="text-right p-3">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {statistics.options.map((opt: any, index: number) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{opt.option}</td>
                    <td className="text-right p-3 font-medium">{opt.count}</td>
                    <td className="text-right p-3">{opt.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {statistics.mode && (
            <p className="mt-2 text-sm text-muted-foreground">
              Most common answer: <span className="font-medium">{statistics.mode}</span>
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderCheckboxStats = (questionStat: QuestionStatistic) => {
    const { statistics } = questionStat
    
    if (!statistics.options || statistics.options.length === 0) {
      return <p className="text-sm text-muted-foreground">No responses yet</p>
    }

    const barData = statistics.options.map((opt: any) => ({
      option: opt.option.length > 20 ? opt.option.substring(0, 20) + '...' : opt.option,
      count: opt.count,
      percentage: opt.percentage,
    }))

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-4">Selection Frequency</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="option" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Option</th>
                <th className="text-right p-3">Selected</th>
                <th className="text-right p-3">% of Respondents</th>
              </tr>
            </thead>
            <tbody>
              {statistics.options.map((opt: any, index: number) => (
                <tr key={index} className="border-t">
                  <td className="p-3">{opt.option}</td>
                  <td className="text-right p-3 font-medium">{opt.count}</td>
                  <td className="text-right p-3">{opt.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderLinearScaleStats = (questionStat: QuestionStatistic) => {
    const { statistics } = questionStat
    
    if (!statistics.distribution || statistics.distribution.length === 0) {
      return <p className="text-sm text-muted-foreground">No responses yet</p>
    }

    const barData = statistics.distribution.map((d: any) => ({
      value: d.value.toString(),
      count: d.count,
      percentage: d.percentage,
    }))

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.average}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Median</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.median}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.mode || 'N/A'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.response_count}</div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Chart */}
        <div>
          <h4 className="text-sm font-medium mb-4">Response Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="value" />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-2 border rounded shadow-lg">
                        <p className="font-medium">Value: {payload[0].payload.value}</p>
                        <p>Count: {payload[0].value}</p>
                        <p>Percentage: {payload[0].payload.percentage}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Range Info */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Min: {statistics.min}</span>
          <span>Max: {statistics.max}</span>
        </div>
      </div>
    )
  }

  const renderRatingStats = (questionStat: QuestionStatistic) => {
    const { statistics } = questionStat
    
    if (!statistics.distribution || statistics.distribution.length === 0) {
      return <p className="text-sm text-muted-foreground">No responses yet</p>
    }

    // Get rating icon from question statistics metadata (if available)
    const ratingStyle = (questionStat as any).rating_style || 'star'
    const ratingIcon = ratingStyle === 'heart' ? '❤️' : ratingStyle === 'thumbs' ? '👍' : '⭐'

    const barData = statistics.distribution.map((d: any) => ({
      value: d.value.toString(),
      count: d.count,
      percentage: d.percentage,
    }))

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Rating</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {statistics.average}
                <span className="text-xl">{ratingIcon}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Median</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {statistics.median}
                <span className="text-xl">{ratingIcon}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Most Common</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {statistics.mode || 'N/A'}
                {statistics.mode && <span className="text-xl">{ratingIcon}</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.response_count}</div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Chart with Icons */}
        <div>
          <h4 className="text-sm font-medium mb-4">Rating Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="value" 
                label={{ value: `${ratingIcon} Rating`, position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium text-lg">{payload[0].payload.value} {ratingIcon}</p>
                        <p className="text-sm">Count: {payload[0].value}</p>
                        <p className="text-sm">Percentage: {payload[0].payload.percentage}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="count" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Visual Rating Display */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Visual Summary</h4>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Average Rating</div>
              <div className="flex gap-1">
                {Array.from({ length: statistics.max || 5 }, (_, i) => (
                  <span 
                    key={i} 
                    className="text-3xl"
                    style={{ 
                      opacity: i < Math.round(statistics.average) ? 1 : 0.2 
                    }}
                  >
                    {ratingIcon}
                  </span>
                ))}
              </div>
              <div className="text-sm font-medium mt-2">
                {statistics.average} out of {statistics.max || 5}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTextStats = (questionStat: QuestionStatistic) => {
    const { statistics } = questionStat
    
    if (!statistics.responses || statistics.responses.length === 0) {
      return <p className="text-sm text-muted-foreground">No responses yet</p>
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total Responses: </span>
            <span className="font-medium">{statistics.response_count}</span>
          </div>
          {statistics.word_count_avg && (
            <div>
              <span className="text-muted-foreground">Avg. Word Count: </span>
              <span className="font-medium">{statistics.word_count_avg}</span>
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Responses</h4>
          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <div className="space-y-3">
              {statistics.responses.map((response: string, index: number) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{response}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading statistics...</div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-3xl font-bold">{statistics.form_title}</h2>
          <p className="text-muted-foreground">Form Statistics & Analytics</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.total_responses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.completion_rate}%</div>
          </CardContent>
        </Card>

        {statistics.time_statistics && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Latest Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {format(new Date(statistics.time_statistics.latest_response), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(statistics.time_statistics.latest_response), 'h:mm a')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Avg. Daily
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {statistics.time_statistics.average_daily_responses.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">responses/day</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Question Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Question-by-Question Analysis</CardTitle>
          <CardDescription>
            Detailed statistics for each question in the form
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {statistics.question_statistics.map((questionStat, index) => (
              <div key={questionStat.question_id} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Q{index + 1}</Badge>
                      <h3 className="font-medium">{questionStat.question_text}</h3>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Type: {questionStat.question_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{questionStat.total_responses} responses</span>
                      <span>•</span>
                      <span>
                        {statistics.total_responses > 0
                          ? ((questionStat.total_responses / statistics.total_responses) * 100).toFixed(1)
                          : 0}% response rate
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="pl-6">
                  {renderQuestionStatistics(questionStat)}
                </div>

                {index < statistics.question_statistics.length - 1 && (
                  <div className="border-t pt-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

