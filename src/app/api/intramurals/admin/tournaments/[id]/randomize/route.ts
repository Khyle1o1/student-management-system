import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { advanceDoubleEliminationMatch, getDoubleEliminationRoundIndex } from "@/lib/double-elimination-progress"
import { generateBracket } from "@/lib/tournament-bracket"

export const dynamic = 'force-dynamic'

// POST - Randomize tournament bracket
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

    // Check if bracket is locked
    if (tournament.randomize_locked) {
      return NextResponse.json(
        { error: 'Bracket is locked and cannot be randomized' },
        { status: 400 }
      )
    }

    // Check randomization limit
    const maxAttempts = tournament.max_random_attempts || 5
    if (tournament.randomize_count >= maxAttempts) {
      return NextResponse.json(
        { error: `Maximum randomization attempts (${maxAttempts}) reached` },
        { status: 400 }
      )
    }

    // Fetch tournament teams
    const { data: tournamentTeams, error: teamsError } = await supabaseAdmin
      .from('intramurals_tournament_teams')
      .select(`
        team_id,
        teams:team_id (
          id,
          name
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('seed')

    if (teamsError || !tournamentTeams || tournamentTeams.length === 0) {
      return NextResponse.json(
        { error: 'No teams found for tournament' },
        { status: 400 }
      )
    }

    // Extract team data
    const teams = tournamentTeams.map((tt: any) => ({
      id: tt.teams.id,
      name: tt.teams.name,
    }))

    // Generate new bracket with randomization
    const bracket = generateBracket(
      teams,
      tournament.bracket_type as any,
      true // Always randomize when this endpoint is called
    )

    // Delete existing matches
    const { error: deleteError } = await supabaseAdmin
      .from('intramurals_matches')
      .delete()
      .eq('tournament_id', tournamentId)

    if (deleteError) {
      console.error('Error deleting old matches:', deleteError)
      return NextResponse.json(
        { error: 'Failed to reset bracket' },
        { status: 500 }
      )
    }

    let matchesToInsert: any[] = []
    let allMatches: any[] = []

    if (tournament.bracket_type === 'double_elimination' && bracket.doubleElimination) {
      const firstWinnersRound = bracket.doubleElimination.winnersBracket.find(
        round => round.stageRound === 1
      )

      if (firstWinnersRound) {
        matchesToInsert = firstWinnersRound.matches.map(match => {
          const singleTeamId = match.team1Id || match.team2Id || null
          const bothTeamsPresent = Boolean(match.team1Id && match.team2Id)

          return {
            tournament_id: tournamentId,
            round: getDoubleEliminationRoundIndex(match),
            match_number: match.matchNumber,
            team1_id: match.team1Id ?? null,
            team2_id: match.team2Id ?? null,
            is_bye: match.isBye,
            is_third_place: false,
            winner_id: match.isBye ? singleTeamId : null,
            status: match.isBye
              ? 'completed'
              : bothTeamsPresent
              ? 'in_progress'
              : 'pending',
            completed_at: match.isBye ? new Date().toISOString() : null,
            bracket_stage: match.bracket,
            stage_round: match.stageRound,
            display_label: match.name,
            template_key: match.templateKey,
          }
        })
      }
    } else {
      matchesToInsert = bracket.matches.map((match) => ({
        tournament_id: tournamentId,
        round: match.round,
        match_number: match.match_number,
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        is_bye: match.is_bye,
        is_third_place: match.is_third_place || false,
        winner_id: match.is_bye ? (match.team1_id || match.team2_id) : null,
        status: match.is_bye ? 'completed' : 'pending',
        completed_at: match.is_bye ? new Date().toISOString() : null,
        bracket_stage: match.bracket_type || null,
        stage_round: match.stage_round ?? match.round ?? null,
        display_label: match.label || null,
        template_key: match.template_key || null,
      }))
    }

    let insertedMatches: any[] = []
    if (matchesToInsert.length > 0) {
      const { data, error: matchesError } = await supabaseAdmin
        .from('intramurals_matches')
        .insert(matchesToInsert)
        .select()

      if (matchesError) {
        console.error('Error creating new matches:', matchesError)
        return NextResponse.json(
          { error: 'Failed to create new bracket' },
          { status: 500 }
        )
      }

      insertedMatches = data || []
    }

    allMatches = insertedMatches

    if (tournament.bracket_type === 'double_elimination' && bracket.doubleElimination) {
      for (const match of insertedMatches) {
        if (match.is_bye && match.winner_id) {
          await advanceDoubleEliminationMatch({
            supabase: supabaseAdmin,
            tournamentId,
            templateSummary: bracket.doubleElimination,
            match,
            winnerId: match.winner_id,
          })
        }
      }

      const { data: refreshedAfterByes } = await supabaseAdmin
        .from('intramurals_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true })

      if (refreshedAfterByes) {
        allMatches = refreshedAfterByes
      }
    } else if (tournament.bracket_type === 'single_elimination' && insertedMatches.length > 0) {
      const createKey = (round: number, matchNumber: number, isThirdPlace?: boolean | null) =>
        `${round}-${matchNumber}-${isThirdPlace ? 1 : 0}`

      const insertedMap = new Map<string, any>()
      insertedMatches.forEach((match: any) => {
        insertedMap.set(createKey(match.round, match.match_number, match.is_third_place), match)
      })

      const linkUpdates: Promise<any>[] = []

      bracket.matches.forEach((match) => {
        const current = insertedMap.get(createKey(match.round, match.match_number, match.is_third_place))
        if (!current) return

        const updateFields: Record<string, any> = {}

        if (match.next_round && match.next_match_number) {
          const target = insertedMap.get(
            createKey(match.next_round, match.next_match_number, match.next_is_third_place)
          )
          if (target) {
            updateFields.next_match_id = target.id
            updateFields.next_match_position = match.next_match_position || null
          }
        }

        if (match.loser_next_round && match.loser_next_match_number) {
          const target = insertedMap.get(
            createKey(
              match.loser_next_round,
              match.loser_next_match_number,
              match.loser_next_is_third_place
            )
          )
          if (target) {
            updateFields.loser_next_match_id = target.id
            updateFields.loser_next_match_position = match.loser_next_match_position || null
          }
        }

        if (Object.keys(updateFields).length > 0) {
          linkUpdates.push((async () => {
            await supabaseAdmin
              .from('intramurals_matches')
              .update(updateFields)
              .eq('id', current.id)
              .select()
          })())
        }
      })

      if (linkUpdates.length > 0) {
        await Promise.all(linkUpdates)
      }

      const { data: refreshedMatches } = await supabaseAdmin
        .from('intramurals_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true })

      if (refreshedMatches) {
        allMatches = refreshedMatches
        const refreshedMap = new Map<string, any>()
        refreshedMatches.forEach((match: any) => {
          refreshedMap.set(createKey(match.round, match.match_number, match.is_third_place), match)
        })

        const byeUpdates: Promise<any>[] = []

        bracket.matches.forEach((match) => {
          if (!match.is_bye || !match.winner_id || !match.next_round || !match.next_match_number) {
            return
          }

          const current = refreshedMap.get(createKey(match.round, match.match_number, match.is_third_place))
          if (!current) return

          const target = refreshedMap.get(
            createKey(match.next_round, match.next_match_number, match.next_is_third_place)
          )
          if (!target) return

          const position = match.next_match_position || 1
          const updateField = position === 1 ? 'team1_id' : 'team2_id'
          const team1After = position === 1 ? match.winner_id : target.team1_id
          const team2After = position === 2 ? match.winner_id : target.team2_id
          const computedStatus = target.status === 'completed'
            ? 'completed'
            : team1After && team2After
              ? 'in_progress'
              : 'pending'

          byeUpdates.push((async () => {
            await supabaseAdmin
              .from('intramurals_matches')
              .update({
                [updateField]: match.winner_id,
                status: computedStatus,
              })
              .eq('id', target.id)
              .select()
          })())

          refreshedMap.set(createKey(target.round, target.match_number, target.is_third_place), {
            ...target,
            team1_id: team1After,
            team2_id: team2After,
            status: computedStatus,
          })
        })

        if (byeUpdates.length > 0) {
          await Promise.all(byeUpdates)

          const { data: postByeMatches } = await supabaseAdmin
            .from('intramurals_matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('round', { ascending: true })
            .order('match_number', { ascending: true })

          if (postByeMatches) {
            allMatches = postByeMatches
          }
        }
      }
    }

    // Update randomization count
    const updatePayload: Record<string, any> = {
      randomize_count: (tournament.randomize_count || 0) + 1,
    }

    if (tournament.bracket_type === 'double_elimination' && bracket.doubleElimination) {
      updatePayload.bracket_template = bracket.doubleElimination
    }

    const { error: updateError } = await supabaseAdmin
      .from('intramurals_events')
      .update(updatePayload)
      .eq('id', tournamentId)

    if (updateError) {
      console.error('Error updating randomize count:', updateError)
    }

    return NextResponse.json({
      success: true,
      randomize_count: (tournament.randomize_count || 0) + 1,
      max_random_attempts: maxAttempts,
      matches: allMatches,
      bracket_structure: bracket,
    })
  } catch (error) {
    console.error('Error in randomize tournament API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

