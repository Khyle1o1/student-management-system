import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("intramurals_events")
      .select("id, name, category, bracket_type, randomize_locked, is_tournament, created_at, updated_at")
      .eq("is_tournament", true)
      .order("created_at", { ascending: false })

    if (eventsError) {
      console.error("Error fetching tournaments:", eventsError)
      return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 })
    }

    const tournamentIds = events?.map((event) => event.id) || []
    let matchInfo: Record<string, { total: number; rounds: number; has_third_place: boolean }> = {}

    if (tournamentIds.length > 0) {
      const { data: matches, error: matchesError } = await supabaseAdmin
        .from("intramurals_matches")
        .select("tournament_id, round, is_third_place")
        .in("tournament_id", tournamentIds)

      if (matchesError) {
        console.error("Error fetching tournament matches:", matchesError)
      } else {
        matchInfo = matches.reduce((acc, match) => {
          const existing = acc[match.tournament_id] || { total: 0, rounds: 0, has_third_place: false }
          return {
            ...acc,
            [match.tournament_id]: {
              total: existing.total + 1,
              rounds: Math.max(existing.rounds, match.round || 0),
              has_third_place: existing.has_third_place || !!match.is_third_place,
            },
          }
        }, matchInfo)
      }
    }

    const tournaments = (events || []).map((event) => ({
      id: event.id,
      name: event.name,
      category: event.category,
      bracket_type: event.bracket_type,
      randomize_locked: event.randomize_locked,
      created_at: event.created_at,
      updated_at: event.updated_at,
      match_count: matchInfo[event.id]?.total || 0,
      rounds: matchInfo[event.id]?.rounds || 0,
      has_third_place: matchInfo[event.id]?.has_third_place || false,
    }))

    return NextResponse.json({ tournaments })
  } catch (error) {
    console.error("Error in tournaments API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
