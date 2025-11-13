import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - Fetch all events
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: events, error: eventsError } = await supabaseAdmin
      .from('intramurals_events')
      .select('id, name, category, created_at, updated_at, is_tournament, bracket_type, randomize_locked')
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Fetch medal awards separately and join with teams
    const eventIds = events?.map(e => e.id) || []
    let medalAwards = []
    let medalsError = null
    
    if (eventIds.length > 0) {
      const result = await supabaseAdmin
        .from('intramurals_medal_awards')
        .select('*')
        .in('event_id', eventIds)
      medalAwards = result.data || []
      medalsError = result.error
    }

    if (medalsError) {
      console.error('Error fetching medal awards:', medalsError)
    }

    // Fetch teams for medal awards
    const teamIds = new Set<string>()
    medalAwards.forEach(ma => {
      if (ma.gold_team_id) teamIds.add(ma.gold_team_id)
      if (ma.silver_team_id) teamIds.add(ma.silver_team_id)
      if (ma.bronze_team_id) teamIds.add(ma.bronze_team_id)
    })

    let teams: Array<{ id: string; name: string }> = []
    let teamsError: any = null
    
    if (teamIds.size > 0) {
      const result = await supabaseAdmin
        .from('intramurals_teams')
        .select('id, name')
        .in('id', Array.from(teamIds))
      teams = result.data || []
      teamsError = result.error
    }

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
    }

    // Join the data
    const teamsMap = new Map(teams.map(t => [t.id, t]))
    const medalsMap = new Map(medalAwards.map(ma => [ma.event_id, ma]))

    const data = events?.map(event => {
      const medalAward = medalsMap.get(event.id)
      return {
        ...event,
        medal_awards: medalAward ? [{
          id: medalAward.id,
          gold_team_id: medalAward.gold_team_id,
          silver_team_id: medalAward.silver_team_id,
          bronze_team_id: medalAward.bronze_team_id,
          gold_team: medalAward.gold_team_id ? teamsMap.get(medalAward.gold_team_id) : null,
          silver_team: medalAward.silver_team_id ? teamsMap.get(medalAward.silver_team_id) : null,
          bronze_team: medalAward.bronze_team_id ? teamsMap.get(medalAward.bronze_team_id) : null,
        }] : []
      }
    })

    const error = eventsError

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    return NextResponse.json({ events: data || [] })
  } catch (error) {
    console.error('Error in events API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new event
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
    const { name, category } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      )
    }

    if (!category || !['sports', 'socio-cultural'].includes(category)) {
      return NextResponse.json(
        { error: 'Category must be either "sports" or "socio-cultural"' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('intramurals_events')
      .insert({
        name: name.trim(),
        category: category,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ event: data })
  } catch (error) {
    console.error('Error in create event API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

