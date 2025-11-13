import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

export async function DELETE(
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

    const { id } = await context.params

    const { data: tournament, error: fetchError } = await supabaseAdmin
      .from('intramurals_events')
      .select('id, name, is_tournament')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching tournament before delete:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch tournament' },
        { status: 500 }
      )
    }

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    if (!tournament.is_tournament) {
      return NextResponse.json(
        { error: 'Specified event is not a tournament' },
        { status: 400 }
      )
    }

    const deletePromises = [
      supabaseAdmin.from('intramurals_matches').delete().eq('tournament_id', id),
      supabaseAdmin.from('intramurals_tournament_teams').delete().eq('tournament_id', id),
      supabaseAdmin.from('intramurals_medal_awards').delete().eq('event_id', id),
    ]

    for (const promise of deletePromises) {
      const { error } = await promise
      if (error) {
        console.error('Error deleting tournament data:', error)
        return NextResponse.json(
          { error: 'Failed to delete tournament data' },
          { status: 500 }
        )
      }
    }

    const { error: deleteEventError } = await supabaseAdmin
      .from('intramurals_events')
      .delete()
      .eq('id', id)

    if (deleteEventError) {
      console.error('Error deleting tournament event:', deleteEventError)
      return NextResponse.json(
        { error: 'Failed to delete tournament' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete tournament API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

