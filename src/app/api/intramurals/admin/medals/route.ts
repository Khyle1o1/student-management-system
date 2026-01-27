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

    if (session.user.role !== 'ADMIN') {
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

    // Check if event exists and validate it's a sports event
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

    // STRICT VALIDATION: Only sports events can have medals
    if (event.category !== 'sports') {
      return NextResponse.json(
        { 
          error: 'Medals can only be assigned to sports events. Socio-cultural events use a point-based system.',
          details: 'Please use the points assignment feature for socio-cultural events.'
        },
        { status: 400 }
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

    // AUTO-GENERATE ANNOUNCEMENT
    try {
      // Check if auto-announcements are enabled
      const { data: settings } = await supabaseAdmin
        .from('intramurals_settings')
        .select('auto_announcements_enabled, announcement_approval_required')
        .single()

      const autoAnnouncementsEnabled = settings?.auto_announcements_enabled ?? true
      const approvalRequired = settings?.announcement_approval_required ?? false

      if (autoAnnouncementsEnabled) {
        // Fetch full event details
        const { data: eventDetails } = await supabaseAdmin
          .from('intramurals_events')
          .select('*')
          .eq('id', event_id)
          .single()

        // Create announcement content
        const announcementContent = {
          event_name: eventDetails?.name || 'Unknown Event',
          category: 'Sports',
          gold_team: response.gold_team?.name || null,
          silver_team: response.silver_team?.name || null,
          bronze_team: response.bronze_team?.name || null,
          event_date: eventDetails?.start_time || null,
          location: eventDetails?.location || null
        }

        // Create the announcement
        const { error: announcementError } = await supabaseAdmin
          .from('intramurals_announcements')
          .insert({
            event_id,
            announcement_type: 'sports_medal',
            content: announcementContent,
            admin_id: session.user.id,
            admin_name: session.user.name,
            is_visible: !approvalRequired, // Only visible if no approval required
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (announcementError) {
          console.error('Failed to create announcement:', announcementError)
          // Don't fail the medal assignment if announcement creation fails
        }
      }
    } catch (announcementError) {
      console.error('Error creating announcement:', announcementError)
      // Don't fail the medal assignment if announcement creation fails
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

