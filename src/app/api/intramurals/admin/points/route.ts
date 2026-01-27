import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// Point mapping for placements
const POINTS_MAP: Record<number, number> = {
  1: 10, // 1st place
  2: 7,  // 2nd place
  3: 5,  // 3rd place
  4: 3,  // 4th place
  5: 1   // 5th place
}

interface PointAssignment {
  team_id: string
  placement: number // 1-5
}

// POST - Assign points to teams for a socio-cultural event
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { event_id, points } = body as { event_id: string; points: PointAssignment[] }

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    if (!points || !Array.isArray(points)) {
      return NextResponse.json(
        { error: 'Points array is required' },
        { status: 400 }
      )
    }

    // Validate points data
    for (const point of points) {
      if (!point.team_id || !point.placement) {
        return NextResponse.json(
          { error: 'Each point entry must have team_id and placement' },
          { status: 400 }
        )
      }
      if (point.placement < 1 || point.placement > 5) {
        return NextResponse.json(
          { error: 'Placement must be between 1 and 5' },
          { status: 400 }
        )
      }
    }

    // Check if event exists and validate it's a socio-cultural event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('intramurals_events')
      .select('id, category')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // STRICT VALIDATION: Only socio-cultural events can have points
    if (event.category !== 'socio-cultural') {
      return NextResponse.json(
        { 
          error: 'Points can only be assigned to socio-cultural events. Sports events use medals.',
          details: 'Please use the medal assignment feature for sports events.'
        },
        { status: 400 }
      )
    }

    // Check for duplicate placements
    const placements = points.map(p => p.placement)
    if (new Set(placements).size !== placements.length) {
      return NextResponse.json(
        { error: 'Each placement can only be assigned once' },
        { status: 400 }
      )
    }

    // Delete existing points for this event
    const { error: deleteError } = await supabaseAdmin
      .from('intramurals_points')
      .delete()
      .eq('event_id', event_id)

    if (deleteError) {
      console.error('Error deleting existing points:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing points' },
        { status: 500 }
      )
    }

    // Insert new points
    const pointsToInsert = points.map(point => ({
      event_id,
      team_id: point.team_id,
      placement: point.placement,
      points: POINTS_MAP[point.placement]
    }))

    const { data: insertedPoints, error: insertError } = await supabaseAdmin
      .from('intramurals_points')
      .insert(pointsToInsert)
      .select('*')

    if (insertError) {
      console.error('Error inserting points:', insertError)
      return NextResponse.json(
        { error: 'Failed to assign points' },
        { status: 500 }
      )
    }

    // Fetch team names for response
    const teamIds = points.map(p => p.team_id)
    const { data: teams } = await supabaseAdmin
      .from('intramurals_teams')
      .select('id, name')
      .in('id', teamIds)

    const teamsMap = new Map(teams?.map(t => [t.id, t]) || [])
    const responseData = insertedPoints?.map(point => ({
      ...point,
      team_name: teamsMap.get(point.team_id)?.name || 'Unknown'
    }))

    // AUTO-GENERATE ANNOUNCEMENT
    try {
      // Check if auto-announcements are enabled
      const { data: settings } = await supabaseAdmin
        .from('intramurals_settings')
        .select('auto_announcements_enabled, announcement_approval_required')
        .single()

      const autoAnnouncementsEnabled = settings?.auto_announcements_enabled ?? true
      const approvalRequired = settings?.announcement_approval_required ?? false

      if (autoAnnouncementsEnabled && responseData && responseData.length > 0) {
        // Fetch full event details
        const { data: eventDetails } = await supabaseAdmin
          .from('intramurals_events')
          .select('*')
          .eq('id', event_id)
          .single()

        // Create announcement content with all point assignments
        const pointsAwarded = responseData.map(point => ({
          team_name: point.team_name,
          placement: point.placement,
          points: point.points
        })).sort((a, b) => a.placement - b.placement) // Sort by placement

        const announcementContent = {
          event_name: eventDetails?.name || 'Unknown Event',
          category: 'Socio-Cultural',
          points_awarded: pointsAwarded,
          event_date: eventDetails?.start_time || null,
          location: eventDetails?.location || null
        }

        // Create the announcement
        const { error: announcementError } = await supabaseAdmin
          .from('intramurals_announcements')
          .insert({
            event_id,
            announcement_type: 'sociocultural_points',
            content: announcementContent,
            admin_id: session.user.id,
            admin_name: session.user.name,
            is_visible: !approvalRequired, // Only visible if no approval required
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (announcementError) {
          console.error('Failed to create announcement:', announcementError)
          // Don't fail the points assignment if announcement creation fails
        }
      }
    } catch (announcementError) {
      console.error('Error creating announcement:', announcementError)
      // Don't fail the points assignment if announcement creation fails
    }

    return NextResponse.json({ 
      points: responseData,
      message: 'Points assigned successfully'
    })
  } catch (error) {
    console.error('Error in assign points API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get points for all events or a specific event
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    let query = supabaseAdmin
      .from('intramurals_points')
      .select(`
        *,
        team:intramurals_teams(id, name),
        event:intramurals_events(id, name, category)
      `)
      .order('placement', { ascending: true })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching points:', error)
      return NextResponse.json(
        { error: 'Failed to fetch points' },
        { status: 500 }
      )
    }

    return NextResponse.json({ points: data || [] })
  } catch (error) {
    console.error('Error in get points API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete points for an event
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('intramurals_points')
      .delete()
      .eq('event_id', eventId)

    if (error) {
      console.error('Error deleting points:', error)
      return NextResponse.json(
        { error: 'Failed to delete points' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Points deleted successfully'
    })
  } catch (error) {
    console.error('Error in delete points API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
