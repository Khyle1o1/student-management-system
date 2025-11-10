import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

interface QuestionStatistics {
  question_id: string
  question_type: string
  question_text: string
  total_responses: number
  statistics: any
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: formId } = await params

    // Check if form exists and user has permission
    const { data: form } = await supabaseAdmin
      .from('evaluation_forms')
      .select('*')
      .eq('id', formId)
      .single()

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (session.user.role !== "ADMIN" && form.created_by !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch all responses
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('form_responses')
      .select('answers, submitted_at')
      .eq('form_id', formId)

    if (responsesError) {
      console.error('Error fetching responses:', responsesError)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    const totalResponses = responses?.length || 0
    const questions = form.questions || []

    // Calculate statistics for each question
    const questionStatistics: QuestionStatistics[] = questions.map((question: any) => {
      const questionId = question.id
      const questionType = question.type
      const answers = responses?.map(r => r.answers[questionId]).filter(a => a !== undefined && a !== null && a !== '') || []
      
      let statistics: any = {
        response_count: answers.length,
        response_rate: totalResponses > 0 ? (answers.length / totalResponses * 100).toFixed(2) : 0,
      }

      switch (questionType) {
        case 'multiple_choice':
        case 'dropdown':
          // Count occurrences of each option
          const optionCounts: Record<string, number> = {}
          answers.forEach(answer => {
            if (answer) {
              optionCounts[answer] = (optionCounts[answer] || 0) + 1
            }
          })

          // Calculate percentages
          const optionStats = Object.entries(optionCounts).map(([option, count]) => ({
            option,
            count,
            percentage: answers.length > 0 ? ((count / answers.length) * 100).toFixed(2) : 0,
          }))

          statistics = {
            ...statistics,
            options: optionStats,
            mode: optionStats.length > 0 ? optionStats.sort((a, b) => b.count - a.count)[0].option : null,
          }
          break

        case 'checkbox':
          // Handle multiple selections
          const checkboxCounts: Record<string, number> = {}
          answers.forEach(answer => {
            if (Array.isArray(answer)) {
              answer.forEach(option => {
                checkboxCounts[option] = (checkboxCounts[option] || 0) + 1
              })
            }
          })

          const checkboxStats = Object.entries(checkboxCounts).map(([option, count]) => ({
            option,
            count,
            percentage: totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(2) : 0,
          }))

          statistics = {
            ...statistics,
            options: checkboxStats,
          }
          break

        case 'linear_scale':
        case 'rating':
          // Calculate average, median, mode, distribution (same logic for both)
          const numericAnswers = answers.map(a => Number(a)).filter(n => !isNaN(n))
          
          if (numericAnswers.length > 0) {
            const sum = numericAnswers.reduce((acc, val) => acc + val, 0)
            const average = sum / numericAnswers.length

            // Calculate distribution
            const distribution: Record<number, number> = {}
            numericAnswers.forEach(value => {
              distribution[value] = (distribution[value] || 0) + 1
            })

            // Sort for median
            const sorted = [...numericAnswers].sort((a, b) => a - b)
            const median = sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)]

            // Find mode
            const mode = Object.entries(distribution)
              .sort((a, b) => b[1] - a[1])[0]?.[0]

            statistics = {
              ...statistics,
              average: average.toFixed(2),
              median: median.toFixed(2),
              mode: mode ? Number(mode) : null,
              distribution: Object.entries(distribution).map(([value, count]) => ({
                value: Number(value),
                count,
                percentage: ((count / numericAnswers.length) * 100).toFixed(2),
              })),
              min: Math.min(...numericAnswers),
              max: Math.max(...numericAnswers),
            }
          }
          break

        case 'short_answer':
        case 'paragraph':
        case 'email':
          // For text responses, just collect them
          statistics = {
            ...statistics,
            responses: answers,
            word_count_avg: answers.length > 0 
              ? (answers.reduce((sum, ans) => sum + String(ans).split(/\s+/).length, 0) / answers.length).toFixed(2)
              : 0,
          }
          break

        case 'date':
        case 'time':
          // Just collect the values
          statistics = {
            ...statistics,
            responses: answers,
          }
          break
      }

      return {
        question_id: questionId,
        question_type: questionType,
        question_text: question.question,
        total_responses: answers.length,
        rating_style: question.rating_style, // Include rating style for rating questions
        statistics,
      }
    })

    // Calculate time-based statistics
    const submissionTimes = responses?.map(r => new Date(r.submitted_at).getTime()) || []
    const timeStats = submissionTimes.length > 1 ? {
      first_response: new Date(Math.min(...submissionTimes)).toISOString(),
      latest_response: new Date(Math.max(...submissionTimes)).toISOString(),
      average_daily_responses: calculateAverageDailyResponses(responses || []),
    } : null

    // Response completion rate (100% for now as partial submissions aren't tracked)
    const completionRate = 100

    return NextResponse.json({
      form_id: formId,
      form_title: form.title,
      total_responses: totalResponses,
      completion_rate: completionRate,
      question_statistics: questionStatistics,
      time_statistics: timeStats,
      generated_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error in GET /api/forms/[id]/statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateAverageDailyResponses(responses: any[]): number {
  if (responses.length === 0) return 0

  const dates = responses.map(r => new Date(r.submitted_at).toDateString())
  const uniqueDates = new Set(dates)
  
  return responses.length / uniqueDates.size
}

