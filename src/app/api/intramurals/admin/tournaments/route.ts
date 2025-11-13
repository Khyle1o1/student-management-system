import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { advanceDoubleEliminationMatch } from "@/lib/double-elimination-progress"
import { generateBracket } from "@/lib/tournament-bracket"

export const dynamic = 'force-dynamic'

// POST - Create a new tournament
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      category, 
      bracket_type, 
      team_ids, 
      randomize_teams,
      max_random_attempts = 5 
    } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tournament name is required' },
        { status: 400 }
      )
    }

    if (!category || !['sports', 'socio-cultural'].includes(category)) {
      return NextResponse.json(
        { error: 'Category must be either "sports" or "socio-cultural"' },
        { status: 400 }
      )
    }

    if (!bracket_type || !['single_elimination', 'double_elimination', 'round_robin'].includes(bracket_type)) {
      return NextResponse.json(
        { error: 'Bracket type must be single_elimination, double_elimination, or round_robin' },
        { status: 400 }
      )
    }

    if (!Array.isArray(team_ids) || team_ids.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 teams are required for a tournament' },
        { status: 400 }
      )
    }

    // Create the tournament event
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from('intramurals_events')
      .insert({
        name: name.trim(),
        category: category,
        is_tournament: true,
        bracket_type: bracket_type,
        randomize_teams: randomize_teams || false,
        randomize_locked: false,
        randomize_count: 0,
        max_random_attempts: max_random_attempts || 5,
      })
      .select()
      .single()

    if (tournamentError) {
      console.error('Error creating tournament:', tournamentError)
      return NextResponse.json(
        { error: 'Failed to create tournament' },
        { status: 500 }
      )
    }

    // Fetch team details
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('intramurals_teams')
      .select('id, name')
      .in('id', team_ids)

    if (teamsError || !teams || teams.length !== team_ids.length) {
      console.error('Error fetching teams:', teamsError)
      return NextResponse.json(
        { error: 'Some teams were not found' },
        { status: 400 }
      )
    }

    // Add teams to tournament with seeds
    const tournamentTeams = teams.map((team, index) => ({
      tournament_id: tournament.id,
      team_id: team.id,
      seed: index + 1,
    }))

    const { error: teamsInsertError } = await supabaseAdmin
      .from('intramurals_tournament_teams')
      .insert(tournamentTeams)

    if (teamsInsertError) {
      console.error('Error adding teams to tournament:', teamsInsertError)
      // Clean up tournament
      await supabaseAdmin.from('intramurals_events').delete().eq('id', tournament.id)
      return NextResponse.json(
        { error: 'Failed to add teams to tournament' },
        { status: 500 }
      )
    }

    // Generate bracket
    const bracket = generateBracket(
      teams.map((t, i) => ({ id: t.id, name: t.name, seed: i + 1 })),
      bracket_type as any,
      randomize_teams || false
    )

    let matchesToInsert: any[] = []
    let allMatches: any[] = []

    if (bracket_type === 'double_elimination' && bracket.doubleElimination) {
      const templateSummary = bracket.doubleElimination

      const { error: templateError } = await supabaseAdmin
        .from('intramurals_events')
        .update({ bracket_template: templateSummary })
        .eq('id', tournament.id)

      if (templateError) {
        console.error('Error saving bracket template:', templateError)
        await supabaseAdmin.from('intramurals_tournament_teams').delete().eq('tournament_id', tournament.id)
        await supabaseAdmin.from('intramurals_events').delete().eq('id', tournament.id)
        return NextResponse.json(
          { error: 'Failed to save bracket template' },
          { status: 500 }
        )
      }

      const firstWinnersRound = templateSummary.winnersBracket.find(
        round => round.stageRound === 1
      )

      if (firstWinnersRound) {
        matchesToInsert = firstWinnersRound.matches.map(match => {
          const singleTeamId = match.team1Id || match.team2Id || null
          const bothTeamsPresent = Boolean(match.team1Id && match.team2Id)

          return {
            tournament_id: tournament.id,
            round: match.stageRound,
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
        tournament_id: tournament.id,
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
        console.error('Error creating matches:', matchesError)
        // Clean up
        await supabaseAdmin.from('intramurals_tournament_teams').delete().eq('tournament_id', tournament.id)
        await supabaseAdmin.from('intramurals_events').delete().eq('id', tournament.id)
        return NextResponse.json(
          { error: 'Failed to create bracket matches' },
          { status: 500 }
        )
      }

      insertedMatches = data || []
    }

    allMatches = insertedMatches

    if (
      bracket_type === 'double_elimination' &&
      bracket.doubleElimination &&
      insertedMatches.length > 0
    ) {
      for (const match of insertedMatches) {
        if (match.is_bye && match.winner_id) {
          await advanceDoubleEliminationMatch({
            supabase: supabaseAdmin,
            tournamentId: tournament.id,
            templateSummary: bracket.doubleElimination,
            match,
            winnerId: match.winner_id,
          })
        }
      }

      const { data: refreshedAfterByes } = await supabaseAdmin
        .from('intramurals_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true })

      if (refreshedAfterByes) {
        allMatches = refreshedAfterByes
      }
    }

    if (bracket_type === 'single_elimination' && insertedMatches) {
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
          })())
        }
      })

      if (linkUpdates.length > 0) {
        await Promise.all(linkUpdates)
      }

      // Refresh matches after linking
      const { data: refreshedMatches } = await supabaseAdmin
        .from('intramurals_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
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
          })())

          // Update local map for subsequent operations
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
            .eq('tournament_id', tournament.id)
            .order('round', { ascending: true })
            .order('match_number', { ascending: true })

          if (postByeMatches) {
            allMatches = postByeMatches
          }
        }
      }
    }

    return NextResponse.json({ 
      tournament,
      teams: tournamentTeams,
      matches: allMatches,
      bracket_structure: bracket
    })
  } catch (error) {
    console.error('Error in create tournament API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

