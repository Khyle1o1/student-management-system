import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { z } from "zod"

// Validation schema for evaluation questions
const evaluationQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'rating', 'text', 'boolean']),
  question: z.string().min(1, "Question text is required"),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
  min_rating: z.number().optional(),
  max_rating: z.number().optional(),
}).refine((data) => {
  // If type is multiple_choice, options must be provided
  if (data.type === 'multiple_choice' && (!data.options || data.options.length < 2)) {
    return false;
  }
  // If type is rating, min and max rating must be provided
  if (data.type === 'rating' && (data.min_rating === undefined || data.max_rating === undefined)) {
    return false;
  }
  return true;
}, {
  message: "Invalid question configuration",
})

const createEvaluationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  questions: z.array(evaluationQuestionSchema).min(1, "At least one question is required"),
  is_template: z.boolean().default(true),
})

const updateEvaluationSchema = createEvaluationSchema.partial()

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
    const templatesOnly = searchParams.get('templates_only') === 'true'
    
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('evaluations')
      .select(`
        id,
        title,
        description,
        questions,
        is_template,
        created_by,
        created_at,
        updated_at,
        creator:users(
          id,
          name,
          email
        )
      `, { count: 'exact' })

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (templatesOnly) {
      query = query.eq('is_template', true)
    }

    const { data: evaluations, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching evaluations:', error)
      return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 })
    }

    return NextResponse.json({
      evaluations: evaluations || [],
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/evaluations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data = createEvaluationSchema.parse(body)

    // Create the evaluation
    const { data: evaluation, error } = await supabase
      .from('evaluations')
      .insert([{
        title: data.title,
        description: data.description || null,
        questions: data.questions,
        is_template: data.is_template,
        created_by: session.user.id,
      }])
      .select(`
        *,
        creator:users(
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating evaluation:', error)
      return NextResponse.json({ error: 'Failed to create evaluation' }, { status: 500 })
    }

    return NextResponse.json(evaluation, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/evaluations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 