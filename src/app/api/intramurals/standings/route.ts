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

interface TeamPointsCount {
  team_id: string
  team_name: string
  team_color: string | null
  team_logo: string | null
  total_points: number
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

interface PointsStandingsData {
  rank: number
  team_id: string
  team_name: string
  team_color: string | null
  team_logo: string | null
  total_points: number
}

interface EventBreakdownEntry {
  event_id: string
  event_name: string
  category: 'sports' | 'socio_cultural'
  gold: number
  silver: number
  bronze: number
}

// Helper function to calculate medal-based standings (for sports)
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

// Helper function to calculate points-based standings (for socio-cultural)
function calculatePointsStandings(pointsCounts: TeamPointsCount[]): PointsStandingsData[] {
  // Sort by total points DESC
  const sorted = [...pointsCounts].sort((a, b) => b.total_points - a.total_points)

  // Assign ranks (handle ties)
  let currentRank = 1
  const standings: PointsStandingsData[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      // If different points, increment rank
      if (prev.total_points !== curr.total_points) {
        currentRank = i + 1
      }
    }

    standings.push({
      rank: currentRank,
      team_id: sorted[i].team_id,
      team_name: sorted[i].team_name,
      team_color: sorted[i].team_color,
      team_logo: sorted[i].team_logo,
      total_points: sorted[i].total_points,
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

    // =====================================================
    // SPORTS EVENTS - Medal-based System
    // =====================================================
    
    // Fetch sports events with their medal awards
    const { data: sportsEvents, error: sportsEventsError } = await supabaseAdmin
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
      .eq('category', 'sports')

    if (sportsEventsError) {
      console.error('Error fetching sports events:', sportsEventsError)
      return NextResponse.json(
        { error: 'Failed to fetch sports events' },
        { status: 500 }
      )
    }

    // Initialize medal counts for sports
    const sportsMedalCounts: Map<string, TeamMedalCount> = new Map()
    const teamSportsBreakdown: Record<string, EventBreakdownEntry[]> = {}

    teams?.forEach((team) => {
      sportsMedalCounts.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        team_color: team.color,
        team_logo: team.logo,
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0,
      })
      teamSportsBreakdown[team.id] = []
    })

    // Count medals from sports events
    sportsEvents?.forEach((event) => {
      const medalAward = Array.isArray(event.medal_awards)
        ? event.medal_awards[0]
        : event.medal_awards

      if (!medalAward) return

      const recordEventBreakdown = (
        teamId: string,
        medalType: 'gold' | 'silver' | 'bronze'
      ) => {
        if (!teamId) return
        const targetArr = teamSportsBreakdown[teamId]
        if (!targetArr) return

        targetArr.push({
          event_id: event.id,
          event_name: event.name,
          category: 'sports',
          gold: medalType === 'gold' ? 1 : 0,
          silver: medalType === 'silver' ? 1 : 0,
          bronze: medalType === 'bronze' ? 1 : 0,
        })
      }

      // Count gold
      if (medalAward.gold_team_id) {
        const goldTeam = sportsMedalCounts.get(medalAward.gold_team_id)
        if (goldTeam) {
          goldTeam.gold++
          goldTeam.total++
        }
        recordEventBreakdown(medalAward.gold_team_id, 'gold')
      }

      // Count silver
      if (medalAward.silver_team_id) {
        const silverTeam = sportsMedalCounts.get(medalAward.silver_team_id)
        if (silverTeam) {
          silverTeam.silver++
          silverTeam.total++
        }
        recordEventBreakdown(medalAward.silver_team_id, 'silver')
      }

      // Count bronze
      if (medalAward.bronze_team_id) {
        const bronzeTeam = sportsMedalCounts.get(medalAward.bronze_team_id)
        if (bronzeTeam) {
          bronzeTeam.bronze++
          bronzeTeam.total++
        }
        recordEventBreakdown(medalAward.bronze_team_id, 'bronze')
      }
    })

    // =====================================================
    // SOCIO-CULTURAL EVENTS - Points-based System
    // =====================================================
    
    // Fetch all points for socio-cultural events
    const { data: pointsData, error: pointsError } = await supabaseAdmin
      .from('intramurals_points')
      .select(`
        team_id,
        points,
        placement,
        event:intramurals_events!intramurals_points_event_id_fkey(
          id,
          name,
          category
        )
      `)

    if (pointsError) {
      console.error('Error fetching points:', pointsError)
      return NextResponse.json(
        { error: 'Failed to fetch points' },
        { status: 500 }
      )
    }

    // Initialize points counts for socio-cultural
    const socioPointsCounts: Map<string, TeamPointsCount> = new Map()
    const teamSocioBreakdown: Record<string, any[]> = {}

    teams?.forEach((team) => {
      socioPointsCounts.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        team_color: team.color,
        team_logo: team.logo,
        total_points: 0,
      })
      teamSocioBreakdown[team.id] = []
    })

    // Sum up points from socio-cultural events
    pointsData?.forEach((pointEntry: any) => {
      const teamId = pointEntry.team_id
      const points = pointEntry.points
      const event = pointEntry.event

      const team = socioPointsCounts.get(teamId)
      if (team) {
        team.total_points += points
      }

      // Record breakdown
      const targetArr = teamSocioBreakdown[teamId]
      if (targetArr && event) {
        targetArr.push({
          event_id: event.id,
          event_name: event.name,
          category: 'socio_cultural',
          placement: pointEntry.placement,
          points: points,
        })
      }
    })

    // Calculate standings
    const sportsStandings = calculateStandings(Array.from(sportsMedalCounts.values()))
    const socioStandings = calculatePointsStandings(Array.from(socioPointsCounts.values()))

    // Determine champions
    const sportsChampion = sportsStandings.length > 0 && sportsStandings[0].rank === 1 
      ? sportsStandings.filter(s => s.rank === 1)
      : []
    
    const socioChampion = socioStandings.length > 0 && socioStandings[0].rank === 1
      ? socioStandings.filter(s => s.rank === 1)
      : []

    return NextResponse.json({
      visible: true,
      last_updated: settings.last_updated,
      standings: {
        sports: sportsStandings,
        socio_cultural: socioStandings,
      },
      champions: {
        sports: sportsChampion,
        socio_cultural: socioChampion,
      },
      breakdowns: {
        sports: teamSportsBreakdown,
        socio_cultural: teamSocioBreakdown,
      },
    })
  } catch (error) {
    console.error('Error in standings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

