import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// POST - Lock tournament bracket
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: tournamentId } = await context.params

    // Fetch tournament
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from('intramurals_events')
      .select('*')
      .eq('id', tournamentId)
      .eq('is_tournament', true)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Check if already locked
    if (tournament.randomize_locked) {
      return NextResponse.json(
        { error: 'Bracket is already locked' },
        { status: 400 }
      )
    }

    // Lock the bracket
    const { data: updatedTournament, error: updateError } = await supabaseAdmin
      .from('intramurals_events')
      .update({
        randomize_locked: true,
      })
      .eq('id', tournamentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error locking bracket:', updateError)
      return NextResponse.json(
        { error: 'Failed to lock bracket' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
      message: 'Bracket locked successfully. Tournament can now begin.',
    })
  } catch (error) {
    console.error('Error in lock tournament API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

