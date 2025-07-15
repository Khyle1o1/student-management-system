import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: eventId } = params

    // Get the evaluation linked to this event
    const { data: eventEvaluation, error: eventEvalError } = await supabase
      .from('event_evaluations')
      .select(`
        evaluation_id,
        is_required,
        evaluation:evaluations(*)
      `)
      .eq('event_id', eventId)
      .single()

    if (eventEvalError) {
      if (eventEvalError.code === 'PGRST116') {
        return NextResponse.json({ error: 'No evaluation found for this event' }, { status: 404 })
      }
      console.error('Error fetching event evaluation:', eventEvalError)
      return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 })
    }

    // Return the evaluation data
    return NextResponse.json(eventEvaluation.evaluation)

  } catch (error) {
    console.error('Error in GET /api/events/[id]/evaluation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 