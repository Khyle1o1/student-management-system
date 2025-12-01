import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check visibility first
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('intramurals_settings')
      .select('is_visible')
      .single()

    if (settingsError || !settings?.is_visible) {
      return NextResponse.json({ visible: false, match_schedule: [], event_schedule: [] })
    }

    // Upcoming match schedule (sports events with matches)
    const { data: matches, error: matchesError } = await supabaseAdmin
      .from('intramurals_matches')
      .select(`
        id,
        match_time,
        location,
        status,
        event:intramurals_events!intramurals_matches_event_id_fkey(id, name, category),
        team1:intramurals_teams!intramurals_matches_team1_id_fkey(id, name),
        team2:intramurals_teams!intramurals_matches_team2_id_fkey(id, name)
      `)
      .in('status', ['scheduled', 'pending'])
      .order('match_time', { ascending: true })

    if (matchesError) {
      console.error("Error fetching matches:", matchesError)
      return NextResponse.json(
        { error: "Failed to fetch match schedule" },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()

    const upcomingMatches = (matches || []).filter((m) => m.match_time && m.match_time >= now)

    // Event schedule (non-match intramurals events with start_time)
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('intramurals_events')
      .select('id, name, category, start_time, location')
      .neq('category', 'sports')
      .not('start_time', 'is', null)
      .order('start_time', { ascending: true })

    if (eventsError) {
      console.error("Error fetching event schedule:", eventsError)
      return NextResponse.json(
        { error: "Failed to fetch event schedule" },
        { status: 500 }
      )
    }

    const upcomingEvents = (events || []).filter((e) => e.start_time >= now)

    return NextResponse.json({
      visible: true,
      match_schedule: upcomingMatches,
      event_schedule: upcomingEvents,
    })
  } catch (error) {
    console.error("Error in intramurals schedule API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


