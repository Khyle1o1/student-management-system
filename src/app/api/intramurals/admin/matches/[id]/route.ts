import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { advanceDoubleEliminationMatch } from "@/lib/double-elimination-progress"

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

    // Check if tournament is locked
    const { data: tournament } = await supabaseAdmin
      .from('intramurals_events')
      .select('randomize_locked, bracket_type, bracket_template')
      .eq('id', match.tournament_id)
      .single()

    if (!tournament?.randomize_locked) {
      return NextResponse.json(
        { error: 'Tournament bracket must be locked before entering results' },
        { status: 400 }
      )
    }

    const isDoubleElimination = tournament?.bracket_type === 'double_elimination'

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

    // Double elimination brackets use dynamic progression logic
    if (isDoubleElimination && winner_id) {
      await advanceDoubleEliminationMatch({
        supabase: supabaseAdmin,
        tournamentId: match.tournament_id,
        templateSummary: tournament?.bracket_template,
        match: updatedMatch,
        winnerId: winner_id,
        loserId:
          match.team1_id && match.team1_id !== winner_id
            ? match.team1_id
            : match.team2_id && match.team2_id !== winner_id
            ? match.team2_id
            : null,
      })
    }

    // The SQL trigger will automatically advance winners/losers for other formats, but we also
    // do it here to ensure the bracket updates immediately in the UI.
    if (!isDoubleElimination && winner_id && updatedMatch.next_match_id) {
      const { data: nextMatch } = await supabaseAdmin
        .from('intramurals_matches')
        .select('*')
        .eq('id', updatedMatch.next_match_id)
        .single()

      if (nextMatch) {
        const position = updatedMatch.next_match_position || 1
        const updateField = position === 1 ? 'team1_id' : 'team2_id'

        const team1After = position === 1 ? winner_id : nextMatch.team1_id
        const team2After = position === 2 ? winner_id : nextMatch.team2_id
        let newStatus = nextMatch.status

        if (team1After && team2After) {
          newStatus = 'in_progress'
        } else if (!team1After && !team2After) {
          newStatus = 'pending'
        }

        await supabaseAdmin
          .from('intramurals_matches')
          .update({
            [updateField]: winner_id,
            status: newStatus,
          })
          .eq('id', updatedMatch.next_match_id)
      }
    }

    if (!isDoubleElimination && winner_id && updatedMatch.loser_next_match_id) {
      let loserId: string | null = null
      if (match.team1_id && match.team1_id !== winner_id) {
        loserId = match.team1_id
      } else if (match.team2_id && match.team2_id !== winner_id) {
        loserId = match.team2_id
      }

      if (loserId) {
        const { data: loserNextMatch } = await supabaseAdmin
          .from('intramurals_matches')
          .select('*')
          .eq('id', updatedMatch.loser_next_match_id)
          .single()

        if (loserNextMatch) {
          const position = updatedMatch.loser_next_match_position || 1
          const updateField = position === 1 ? 'team1_id' : 'team2_id'

          const team1After = position === 1 ? loserId : loserNextMatch.team1_id
          const team2After = position === 2 ? loserId : loserNextMatch.team2_id
          let newStatus = loserNextMatch.status

          if (team1After && team2After) {
            newStatus = 'in_progress'
          } else if (!team1After && !team2After) {
            newStatus = 'pending'
          }

          await supabaseAdmin
            .from('intramurals_matches')
            .update({
              [updateField]: loserId,
              status: newStatus,
            })
            .eq('id', updatedMatch.loser_next_match_id)
        }
      }
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

