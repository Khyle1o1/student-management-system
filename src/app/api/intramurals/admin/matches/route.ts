import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - List matches (optionally filtered to upcoming)
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: matches, error } = await supabaseAdmin
      .from('intramurals_matches')
      .select(`
        id,
        event_id,
        team1_id,
        team2_id,
        match_time,
        location,
        status,
        winner_id,
        team1_score,
        team2_score,
        event:intramurals_events!intramurals_matches_event_id_fkey(id, name, category),
        team1:intramurals_teams!intramurals_matches_team1_id_fkey(id, name),
        team2:intramurals_teams!intramurals_matches_team2_id_fkey(id, name)
      `)
      .order('match_time', { ascending: true })

    if (error) {
      console.error("Error fetching matches:", error)
      return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
    }

    return NextResponse.json({ matches: matches || [] })
  } catch (error) {
    console.error("Error in matches list API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new match
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
    const { event_id, team1_id, team2_id, match_time, location } = body

    if (!event_id || !team1_id || !team2_id || !match_time) {
      return NextResponse.json(
        { error: "Event, teams, and match time are required" },
        { status: 400 }
      )
    }

    if (team1_id === team2_id) {
      return NextResponse.json(
        { error: "Teams must be different" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('intramurals_matches')
      .insert({
        event_id,
        team1_id,
        team2_id,
        match_time,
        location: location || null,
        // Some existing schemas have this as NOT NULL; default to 1 for now
        match_number: 1,
      } as any)
      .select()
      .single()

    if (error) {
      console.error("Error creating match:", error)
      return NextResponse.json({ error: "Failed to create match" }, { status: 500 })
    }

    return NextResponse.json({ match: data })
  } catch (error) {
    console.error("Error in create match API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


