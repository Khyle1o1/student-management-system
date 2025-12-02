import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

interface TeamMedalCount {
  team_id: string
  team_name: string
  team_color: string | null
  team_logo: string | null
  gold: number
  silver: number
  bronze: number
  total: number
}

interface StandingsData {
  rank: number
  team_id: string
  team_name: string
  team_color: string | null
  team_logo: string | null
  gold: number
  silver: number
  bronze: number
  total: number
}

interface EventBreakdownEntry {
  event_id: string
  event_name: string
  category: 'sports' | 'socio_cultural'
  gold: number
  silver: number
  bronze: number
}

// Helper function to calculate standings with ranking
function calculateStandings(medalCounts: TeamMedalCount[]): StandingsData[] {
  // Sort by gold DESC, silver DESC, bronze DESC
  const sorted = [...medalCounts].sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold
    if (b.silver !== a.silver) return b.silver - a.silver
    return b.bronze - a.bronze
  })

  // Assign ranks (handle ties)
  let currentRank = 1
  const standings: StandingsData[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      // If different medal counts, increment rank
      if (
        prev.gold !== curr.gold ||
        prev.silver !== curr.silver ||
        prev.bronze !== curr.bronze
      ) {
        currentRank = i + 1
      }
    }

    standings.push({
      rank: currentRank,
      team_id: sorted[i].team_id,
      team_name: sorted[i].team_name,
      team_color: sorted[i].team_color,
      team_logo: sorted[i].team_logo,
      gold: sorted[i].gold,
      silver: sorted[i].silver,
      bronze: sorted[i].bronze,
      total: sorted[i].total,
    })
  }

  return standings
}

export async function GET() {
  try {
    // Check if standings are visible
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('intramurals_settings')
      .select('is_visible, last_updated')
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    if (!settings?.is_visible) {
      return NextResponse.json({ visible: false })
    }

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('intramurals_teams')
      .select('id, name, color, logo')
      .order('name')

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    // Fetch all events with their medal awards
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('intramurals_events')
      .select(`
        id,
        name,
        category,
        medal_awards:intramurals_medal_awards(
          gold_team_id,
          silver_team_id,
          bronze_team_id
        )
      `)

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Initialize medal counts for all teams
    const sportsMedalCounts: Map<string, TeamMedalCount> = new Map()
    const socioMedalCounts: Map<string, TeamMedalCount> = new Map()
    const overallMedalCounts: Map<string, TeamMedalCount> = new Map()

    const teamEventBreakdown: Record<string, EventBreakdownEntry[]> = {}

    teams?.forEach((team) => {
      const initialCount = {
        team_id: team.id,
        team_name: team.name,
        team_color: team.color,
        team_logo: team.logo,
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0,
      }
      sportsMedalCounts.set(team.id, { ...initialCount })
      socioMedalCounts.set(team.id, { ...initialCount })
      overallMedalCounts.set(team.id, { ...initialCount })
      teamEventBreakdown[team.id] = []
    })

    // Count medals from events
    events?.forEach((event) => {
      const medalAward = Array.isArray(event.medal_awards)
        ? event.medal_awards[0]
        : event.medal_awards

      if (!medalAward) return

      const targetMap =
        event.category === 'sports' ? sportsMedalCounts : socioMedalCounts
      const recordEventBreakdown = (
        teamId: string,
        medalType: 'gold' | 'silver' | 'bronze'
      ) => {
        if (!teamId) return
        // Normalize category: anything not "sports" is treated as "socio_cultural"
        const normalizedCategory: 'sports' | 'socio_cultural' =
          event.category === 'sports' ? 'sports' : 'socio_cultural'
        const targetArr = teamEventBreakdown[teamId]
        if (!targetArr) return

        targetArr.push({
          event_id: event.id,
          event_name: event.name,
          category: normalizedCategory,
          gold: medalType === 'gold' ? 1 : 0,
          silver: medalType === 'silver' ? 1 : 0,
          bronze: medalType === 'bronze' ? 1 : 0,
        })
      }

      // Count gold
      if (medalAward.gold_team_id) {
        const goldTeam = targetMap.get(medalAward.gold_team_id)
        if (goldTeam) {
          goldTeam.gold++
          goldTeam.total++
        }
        const overallGold = overallMedalCounts.get(medalAward.gold_team_id)
        if (overallGold) {
          overallGold.gold++
          overallGold.total++
        }
        recordEventBreakdown(medalAward.gold_team_id, 'gold')
      }

      // Count silver
      if (medalAward.silver_team_id) {
        const silverTeam = targetMap.get(medalAward.silver_team_id)
        if (silverTeam) {
          silverTeam.silver++
          silverTeam.total++
        }
        const overallSilver = overallMedalCounts.get(medalAward.silver_team_id)
        if (overallSilver) {
          overallSilver.silver++
          overallSilver.total++
        }
        recordEventBreakdown(medalAward.silver_team_id, 'silver')
      }

      // Count bronze
      if (medalAward.bronze_team_id) {
        const bronzeTeam = targetMap.get(medalAward.bronze_team_id)
        if (bronzeTeam) {
          bronzeTeam.bronze++
          bronzeTeam.total++
        }
        const overallBronze = overallMedalCounts.get(medalAward.bronze_team_id)
        if (overallBronze) {
          overallBronze.bronze++
          overallBronze.total++
        }
        recordEventBreakdown(medalAward.bronze_team_id, 'bronze')
      }
    })

    // Calculate standings
    const sportsStandings = calculateStandings(Array.from(sportsMedalCounts.values()))
    const socioStandings = calculateStandings(Array.from(socioMedalCounts.values()))
    const overallStandings = calculateStandings(Array.from(overallMedalCounts.values()))

    return NextResponse.json({
      visible: true,
      last_updated: settings.last_updated,
      standings: {
        sports: sportsStandings,
        socio_cultural: socioStandings,
        overall: overallStandings,
      },
      breakdowns: teamEventBreakdown,
    })
  } catch (error) {
    console.error('Error in standings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

