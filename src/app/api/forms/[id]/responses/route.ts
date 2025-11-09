import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"

// Schema for submitting a form response
const submitResponseSchema = z.object({
  answers: z.record(z.any()), // Object with question IDs as keys
  respondent_email: z.string().email().optional(),
  respondent_name: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: formId } = params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Check if form exists and user has permission to view responses
    const { data: form } = await supabaseAdmin
      .from('evaluation_forms')
      .select('created_by, title')
      .eq('id', formId)
      .single()

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (session.user.role !== "ADMIN" && form.created_by !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch responses
    const { data: responses, count, error } = await supabaseAdmin
      .from('form_responses')
      .select(`
        id,
        answers,
        respondent_email,
        respondent_name,
        submitted_at,
        respondent:users!form_responses_respondent_id_fkey(
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('form_id', formId)
      .range(offset, offset + limit - 1)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching responses:', error)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    return NextResponse.json({
      responses: responses || [],
      total: count || 0,
      page,
      limit,
    })

  } catch (error) {
    console.error('Error in GET /api/forms/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: formId } = params
    const body = await request.json()
    const data = submitResponseSchema.parse(body)

    // Get client IP and user agent
    const ip_address = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       null
    const user_agent = request.headers.get('user-agent') || null

    // Check if form exists and is published
    const { data: form } = await supabaseAdmin
      .from('evaluation_forms')
      .select('status, settings, closes_at, questions')
      .eq('id', formId)
      .single()

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Form is not accepting responses' }, { status: 400 })
    }

    // Check if form is closed
    if (form.closes_at && new Date(form.closes_at) < new Date()) {
      return NextResponse.json({ error: 'Form has closed' }, { status: 400 })
    }

    // Validate all required questions are answered
    const requiredQuestions = form.questions.filter((q: any) => q.required)
    const missingAnswers = requiredQuestions.filter(
      (q: any) => !data.answers[q.id] || 
      (Array.isArray(data.answers[q.id]) && data.answers[q.id].length === 0)
    )

    if (missingAnswers.length > 0) {
      return NextResponse.json({ 
        error: 'Please answer all required questions',
        missing: missingAnswers.map((q: any) => q.id)
      }, { status: 400 })
    }

    // Check authentication if required
    const session = await auth()
    const settings = form.settings || {}
    
    if (settings.require_login && !session) {
      return NextResponse.json({ error: 'Login required to submit this form' }, { status: 401 })
    }

    // Check for duplicate submissions if not allowed
    if (!settings.allow_multiple_submissions && session) {
      const { count } = await supabaseAdmin
        .from('form_responses')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId)
        .eq('respondent_id', session.user.id)

      if (count && count > 0) {
        return NextResponse.json({ 
          error: 'You have already submitted a response to this form' 
        }, { status: 400 })
      }
    }

    // Create response
    const responseData: any = {
      form_id: formId,
      answers: data.answers,
      respondent_id: session?.user.id || null,
      respondent_email: data.respondent_email || session?.user.email || null,
      respondent_name: data.respondent_name || session?.user.name || null,
      ip_address,
      user_agent,
    }

    const { data: response, error } = await supabaseAdmin
      .from('form_responses')
      .insert([responseData])
      .select()
      .single()

    if (error) {
      console.error('Error creating response:', error)
      return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      response_id: response.id,
      message: settings.confirmation_message || 'Thank you for your response!'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/forms/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

