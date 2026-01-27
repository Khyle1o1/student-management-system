import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - Fetch public announcements (visible only)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch visible announcements ordered by most recent first
    const { data: announcements, error } = await supabaseAdmin
      .from('intramurals_announcements')
      .select(`
        *,
        event:intramurals_events(
          id,
          name,
          category,
          start_time,
          location
        )
      `)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      )
    }

    // Also get total count for pagination
    const { count } = await supabaseAdmin
      .from('intramurals_announcements')
      .select('*', { count: 'exact', head: true })
      .eq('is_visible', true)

    return NextResponse.json({
      announcements: announcements || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error in announcements API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
