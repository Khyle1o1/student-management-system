import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"

// Enhanced validation schema for form questions
const formQuestionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'short_answer',
    'paragraph',
    'multiple_choice',
    'checkbox',
    'linear_scale',
    'rating',
    'dropdown',
    'date',
    'time',
    'email'
  ]),
  question: z.string().min(1, "Question text is required"),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  order: z.number().default(0),
  sectionId: z.string().optional(),
  // Linear scale specific
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  min_label: z.string().optional(),
  max_label: z.string().optional(),
  // Rating specific
  rating_style: z.enum(['star', 'heart', 'thumbs']).optional(),
  // Validation rules
  validation: z.object({
    min_length: z.number().optional(),
    max_length: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
}).refine((data) => {
  // Validate multiple choice and dropdown have options
  if (['multiple_choice', 'checkbox', 'dropdown'].includes(data.type)) {
    return data.options && data.options.length >= 1
  }
  // Validate linear scale has min and max
  if (data.type === 'linear_scale') {
    return data.min_value !== undefined && data.max_value !== undefined
  }
  // Validate rating has max_value and rating_style
  if (data.type === 'rating') {
    return data.max_value !== undefined && data.rating_style !== undefined
  }
  return true
}, {
  message: "Invalid question configuration",
})

const formSettingsSchema = z.object({
  allow_multiple_submissions: z.boolean().default(false),
  show_progress_bar: z.boolean().default(true),
  shuffle_questions: z.boolean().default(false),
  collect_email: z.boolean().default(true),
  require_login: z.boolean().default(false),
  send_confirmation: z.boolean().default(false),
  confirmation_message: z.string().optional(),
  redirect_url: z.string().optional(),
})

const createFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  questions: z.array(formQuestionSchema).min(1, "At least one question is required"),
  settings: formSettingsSchema.optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).default('DRAFT'),
  closes_at: z.string().optional(), // ISO date string
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('evaluation_forms')
      .select(`
        id,
        title,
        description,
        questions,
        settings,
        status,
        created_by,
        published_at,
        closes_at,
        created_at,
        updated_at,
        creator:users!evaluation_forms_created_by_fkey(
          id,
          name,
          email
        )
      `, { count: 'exact' })

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Role-based filtering
    // ADMIN and EVENTS_STAFF can see all forms, others only see their own
    if (session.user.role !== "ADMIN" && session.user.role !== "EVENTS_STAFF") {
      query = query.eq('created_by', session.user.id)
    }

    const { data: forms, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching forms:', error)
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
    }

    // Get response counts for each form
    const formsWithStats = await Promise.all(
      (forms || []).map(async (form) => {
        const { count: responseCount } = await supabaseAdmin
          .from('form_responses')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', form.id)

        return {
          ...form,
          response_count: responseCount || 0,
        }
      })
    )

    return NextResponse.json({
      forms: formsWithStats,
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/forms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ADMIN, EVENTS_STAFF, and org accounts can create forms
    if (!['ADMIN','EVENTS_STAFF','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Forbidden - Only admins can create forms" }, { status: 403 })
    }

    const body = await request.json()
    const data = createFormSchema.parse(body)

    // Sort questions by order
    const sortedQuestions = [...data.questions].sort((a, b) => a.order - b.order)

    const formData: any = {
      title: data.title,
      description: data.description || null,
      questions: sortedQuestions,
      settings: data.settings || {},
      status: data.status,
      created_by: session.user.id,
    }

    // Set published_at if status is PUBLISHED
    if (data.status === 'PUBLISHED') {
      formData.published_at = new Date().toISOString()
    }

    // Set closes_at if provided
    if (data.closes_at) {
      formData.closes_at = data.closes_at
    }

    // Create the form
    const { data: form, error } = await supabaseAdmin
      .from('evaluation_forms')
      .insert([formData])
      .select(`
        *,
        creator:users!evaluation_forms_created_by_fkey(
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating form:', error)
      return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
    }

    // Initialize analytics record
    await supabaseAdmin
      .from('form_analytics')
      .insert([{
        form_id: form.id,
        total_responses: 0,
        completion_rate: 0,
        question_statistics: {},
      }])

    return NextResponse.json(form, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/forms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

