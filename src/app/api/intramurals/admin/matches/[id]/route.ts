import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// PUT - Update match result
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await context.params

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { winner_id, team1_score, team2_score } = body

    // Fetch match
    const { data: match, error: matchError } = await supabaseAdmin
      .from('intramurals_matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Validate winner
    if (winner_id && winner_id !== match.team1_id && winner_id !== match.team2_id) {
      return NextResponse.json(
        { error: 'Winner must be one of the participating teams' },
        { status: 400 }
      )
    }


    // Update match
    const updateData: any = {
      winner_id: winner_id || null,
      team1_score: team1_score || null,
      team2_score: team2_score || null,
      status: winner_id ? 'completed' : 'in_progress',
      completed_at: winner_id ? new Date().toISOString() : null,
    }

    const { data: updatedMatch, error: updateError } = await supabaseAdmin
      .from('intramurals_matches')
      .update(updateData)
      .eq('id', matchId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating match:', updateError)
      return NextResponse.json(
        { error: 'Failed to update match' },
        { status: 500 }
      )
    }

 
    return NextResponse.json({
      success: true,
      match: updatedMatch,
    })
  } catch (error) {
    console.error('Error in update match API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

