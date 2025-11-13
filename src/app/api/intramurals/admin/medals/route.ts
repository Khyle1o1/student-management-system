import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// POST - Assign medals to an event
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
    const { event_id, gold_team_id, silver_team_id, bronze_team_id } = body

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Check if event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from('intramurals_events')
      .select('id')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if medal award already exists
    const { data: existingAward } = await supabaseAdmin
      .from('intramurals_medal_awards')
      .select('id')
      .eq('event_id', event_id)
      .single()

    let data, error

    if (existingAward) {
      // Update existing award
      const result = await supabaseAdmin
        .from('intramurals_medal_awards')
        .update({
          gold_team_id: gold_team_id || null,
          silver_team_id: silver_team_id || null,
          bronze_team_id: bronze_team_id || null,
        })
        .eq('event_id', event_id)
        .select('*')
        .single()

      data = result.data
      error = result.error
    } else {
      // Create new award
      const result = await supabaseAdmin
        .from('intramurals_medal_awards')
        .insert({
          event_id,
          gold_team_id: gold_team_id || null,
          silver_team_id: silver_team_id || null,
          bronze_team_id: bronze_team_id || null,
        })
        .select('*')
        .single()

      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Error assigning medals:', error)
      return NextResponse.json(
        { error: 'Failed to assign medals' },
        { status: 500 }
      )
    }

    // Fetch team names for response
    const teamIds = [data.gold_team_id, data.silver_team_id, data.bronze_team_id].filter(Boolean)
    const { data: teams } = await supabaseAdmin
      .from('intramurals_teams')
      .select('id, name')
      .in('id', teamIds)

    const teamsMap = new Map(teams?.map(t => [t.id, t]) || [])
    const response = {
      ...data,
      gold_team: data.gold_team_id ? teamsMap.get(data.gold_team_id) : null,
      silver_team: data.silver_team_id ? teamsMap.get(data.silver_team_id) : null,
      bronze_team: data.bronze_team_id ? teamsMap.get(data.bronze_team_id) : null,
    }

    return NextResponse.json({ medal_award: response })
  } catch (error) {
    console.error('Error in assign medals API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

