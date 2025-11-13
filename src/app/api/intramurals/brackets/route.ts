import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - Fetch bracket structure for public display
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json(
        { error: 'event_id parameter is required' },
        { status: 400 }
      )
    }

    // Fetch tournament
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from('intramurals_events')
      .select('*')
      .eq('id', eventId)
      .eq('is_tournament', true)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Fetch tournament teams
    const { data: tournamentTeams, error: teamsError } = await supabaseAdmin
      .from('intramurals_tournament_teams')
      .select(`
        team_id,
        seed,
        teams:team_id (
          id,
          name,
          color,
          logo
        )
      `)
      .eq('tournament_id', eventId)
      .order('seed')

    if (teamsError) {
      console.error('Error fetching tournament teams:', teamsError)
    }

    // Fetch all matches
    const { data: matches, error: matchesError } = await supabaseAdmin
      .from('intramurals_matches')
      .select(`
        *,
        team1:team1_id (
          id,
          name,
          color,
          logo
        ),
        team2:team2_id (
          id,
          name,
          color,
          logo
        ),
        winner:winner_id (
          id,
          name,
          color,
          logo
        )
      `)
      .eq('tournament_id', eventId)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true })

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      return NextResponse.json(
        { error: 'Failed to fetch bracket' },
        { status: 500 }
      )
    }

    // Organize matches by round
    const matchesByRound: Record<number, any[]> = {}
    const maxRound = matches?.reduce((max, m) => Math.max(max, m.round), 0) || 0

    matches?.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = []
      }
      matchesByRound[match.round].push(match)
    })

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        category: tournament.category,
        bracket_type: tournament.bracket_type,
        randomize_locked: tournament.randomize_locked,
        bracket_template: tournament.bracket_template,
      },
      teams: tournamentTeams?.map((tt: any) => ({
        id: tt.teams.id,
        name: tt.teams.name,
        color: tt.teams.color,
        logo: tt.teams.logo,
        seed: tt.seed,
      })) || [],
      matches: matches || [],
      matches_by_round: matchesByRound,
      rounds: maxRound,
    })
  } catch (error) {
    console.error('Error in brackets API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

