import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
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

const updateEvaluationSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  questions: z.array(evaluationQuestionSchema).min(1, "At least one question is required").optional(),
  is_template: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { data: evaluation, error } = await supabaseAdmin
      .from('evaluations')
      .select(`
        *,
        creator:users(
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
      }
      console.error('Error fetching evaluation:', error)
      return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 })
    }

    return NextResponse.json(evaluation)

  } catch (error) {
    console.error('Error in GET /api/evaluations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateEvaluationSchema.parse(body)

    // Check if evaluation exists and if user can modify it
    const { data: existingEvaluation, error: fetchError } = await supabaseAdmin
      .from('evaluations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
      }
      console.error('Error fetching evaluation:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 })
    }

    // Check if there are any event_evaluations using this evaluation
    const { data: eventEvaluations, error: eventEvalError } = await supabaseAdmin
      .from('event_evaluations')
      .select('id')
      .eq('evaluation_id', id)

    if (eventEvalError) {
      console.error('Error checking event evaluations:', eventEvalError)
      return NextResponse.json({ error: 'Failed to check evaluation usage' }, { status: 500 })
    }

    // If evaluation is being used by events, create a new version instead of updating
    if (eventEvaluations && eventEvaluations.length > 0 && data.questions) {
      // Create a new evaluation with updated questions
      const { data: newEvaluation, error: createError } = await supabaseAdmin
        .from('evaluations')
        .insert([{
          title: data.title || existingEvaluation.title,
          description: data.description !== undefined ? data.description : existingEvaluation.description,
          questions: data.questions,
          is_template: data.is_template !== undefined ? data.is_template : existingEvaluation.is_template,
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

      if (createError) {
        console.error('Error creating new evaluation version:', createError)
        return NextResponse.json({ error: 'Failed to create evaluation version' }, { status: 500 })
      }

      return NextResponse.json({
        ...newEvaluation,
        message: 'New version created as original is in use by events'
      })
    }

    // Update the evaluation if it's not in use
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.questions !== undefined) updateData.questions = data.questions
    if (data.is_template !== undefined) updateData.is_template = data.is_template

    const { data: evaluation, error } = await supabaseAdmin
      .from('evaluations')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating evaluation:', error)
      return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 })
    }

    return NextResponse.json(evaluation)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/evaluations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Check if evaluation is being used by any events
    const { data: eventEvaluations, error: eventEvalError } = await supabaseAdmin
      .from('event_evaluations')
      .select('id')
      .eq('evaluation_id', id)

    if (eventEvalError) {
      console.error('Error checking event evaluations:', eventEvalError)
      return NextResponse.json({ error: 'Failed to check evaluation usage' }, { status: 500 })
    }

    if (eventEvaluations && eventEvaluations.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete evaluation that is in use by events' 
      }, { status: 400 })
    }

    // Check if evaluation has responses
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('student_evaluation_responses')
      .select('id')
      .eq('evaluation_id', id)

    if (responsesError) {
      console.error('Error checking evaluation responses:', responsesError)
      return NextResponse.json({ error: 'Failed to check evaluation responses' }, { status: 500 })
    }

    if (responses && responses.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete evaluation that has student responses' 
      }, { status: 400 })
    }

    // Delete the evaluation
    const { error } = await supabaseAdmin
      .from('evaluations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting evaluation:', error)
      return NextResponse.json({ error: 'Failed to delete evaluation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/evaluations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 