import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: eventId } = await params

    // Get the event with its evaluation_id
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('evaluation_id, require_evaluation')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.require_evaluation || !event.evaluation_id) {
      return NextResponse.json({ error: 'No evaluation found for this event' }, { status: 404 })
    }

    // Fetch the evaluation form from the new forms system
    const { data: evaluationForm, error: formError } = await supabaseAdmin
      .from('evaluation_forms')
      .select('*')
      .eq('id', event.evaluation_id)
      .single()

    if (formError || !evaluationForm) {
      console.error('Error fetching evaluation form:', formError)
      return NextResponse.json({ error: 'Evaluation form not found' }, { status: 404 })
    }

    // Return the evaluation form data
    return NextResponse.json(evaluationForm)

  } catch (error) {
    console.error('Error in GET /api/events/[id]/evaluation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 