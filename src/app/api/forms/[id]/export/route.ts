import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

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
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

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
      .select(`
        id,
        answers,
        respondent_email,
        respondent_name,
        submitted_at,
        respondent:users!form_responses_respondent_id_fkey(
          name,
          email
        )
      `)
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false })

    if (responsesError) {
      console.error('Error fetching responses:', responsesError)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    if (format === 'csv') {
      return exportToCSV(form, responses || [])
    } else if (format === 'json') {
      return exportToJSON(form, responses || [])
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in GET /api/forms/[id]/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function exportToCSV(form: any, responses: any[]) {
  const questions = form.questions || []
  
  // Build CSV headers
  const headers = [
    'Response ID',
    'Respondent Name',
    'Respondent Email',
    'Submitted At',
    ...questions.map((q: any) => `${q.question} (${q.type})`),
  ]

  // Build CSV rows
  const rows = responses.map(response => {
    const respondentName = response.respondent?.name || response.respondent_name || 'Anonymous'
    const respondentEmail = response.respondent?.email || response.respondent_email || 'N/A'
    
    return [
      response.id,
      respondentName,
      respondentEmail,
      new Date(response.submitted_at).toLocaleString(),
      ...questions.map((q: any) => {
        const answer = response.answers[q.id]
        if (answer === undefined || answer === null) return ''
        if (Array.isArray(answer)) return answer.join('; ')
        return String(answer)
      }),
    ]
  })

  // Convert to CSV string
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  // Return as downloadable file
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(form.title)}_responses.csv"`,
    },
  })
}

function exportToJSON(form: any, responses: any[]) {
  const exportData = {
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      questions: form.questions,
    },
    responses: responses.map(response => ({
      id: response.id,
      respondent: {
        name: response.respondent?.name || response.respondent_name || 'Anonymous',
        email: response.respondent?.email || response.respondent_email || 'N/A',
      },
      answers: response.answers,
      submitted_at: response.submitted_at,
    })),
    exported_at: new Date().toISOString(),
    total_responses: responses.length,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(form.title)}_responses.json"`,
    },
  })
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50)
}

