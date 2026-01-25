import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { ensureDeletionNotLocked } from "@/lib/system-settings"

export const dynamic = 'force-dynamic'

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
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  min_label: z.string().optional(),
  max_label: z.string().optional(),
  rating_style: z.enum(['star', 'heart', 'thumbs']).optional(),
  validation: z.object({
    min_length: z.number().optional(),
    max_length: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
})

const formSettingsSchema = z.object({
  allow_multiple_submissions: z.boolean().optional(),
  show_progress_bar: z.boolean().optional(),
  shuffle_questions: z.boolean().optional(),
  collect_email: z.boolean().optional(),
  require_login: z.boolean().optional(),
  send_confirmation: z.boolean().optional(),
  confirmation_message: z.string().optional(),
  redirect_url: z.string().optional(),
})

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
})

const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  questions: z.array(formQuestionSchema).optional(),
  sections: z.array(sectionSchema).optional(),
  settings: formSettingsSchema.optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
  closes_at: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch form with creator info
    const { data: form, error } = await supabaseAdmin
      .from('evaluation_forms')
      .select(`
        *,
        creator:users!evaluation_forms_created_by_fkey(
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Get response count
    const { count: responseCount } = await supabaseAdmin
      .from('form_responses')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', id)

    return NextResponse.json({
      ...form,
      response_count: responseCount || 0,
    })

  } catch (error) {
    console.error('Error in GET /api/forms/[id]:', error)
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

    const { id } = await params
    const body = await request.json()
    const data = updateFormSchema.parse(body)

    // Check if form exists and user has permission
    const { data: existingForm } = await supabaseAdmin
      .from('evaluation_forms')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // ADMIN and EVENTS_STAFF can update any form, others only their own
    if (session.user.role !== "ADMIN" && session.user.role !== "EVENTS_STAFF" && existingForm.created_by !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.questions) {
      // Sort questions by order
      updateData.questions = [...data.questions].sort((a, b) => a.order - b.order)
    }
    if (data.sections) {
      // Sort sections by order
      updateData.sections = [...data.sections].sort((a, b) => a.order - b.order)
    }
    if (data.settings) updateData.settings = data.settings
    if (data.status) {
      updateData.status = data.status
      // Set published_at when publishing
      if (data.status === 'PUBLISHED' && !(existingForm as any).published_at) {
        updateData.published_at = new Date().toISOString()
      }
    }
    if (data.closes_at !== undefined) updateData.closes_at = data.closes_at

    // Update the form
    const { data: form, error } = await supabaseAdmin
      .from('evaluation_forms')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating form:', error)
      return NextResponse.json({ error: 'Failed to update form' }, { status: 500 })
    }

    return NextResponse.json(form)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/forms/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const lockResponse = await ensureDeletionNotLocked()
    if (lockResponse) {
      return lockResponse
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if form exists and user has permission
    const { data: existingForm } = await supabaseAdmin
      .from('evaluation_forms')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // ADMIN and EVENTS_STAFF can delete any form, others only their own
    if (session.user.role !== "ADMIN" && session.user.role !== "EVENTS_STAFF" && existingForm.created_by !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the form (cascades to responses and analytics)
    const { error } = await supabaseAdmin
      .from('evaluation_forms')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting form:', error)
      return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/forms/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

