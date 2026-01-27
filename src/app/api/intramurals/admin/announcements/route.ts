import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - Fetch all announcements (admin view - includes hidden ones)
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'INTRAMURALS_STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch all announcements ordered by most recent first
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      )
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from('intramurals_announcements')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      announcements: announcements || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error in admin announcements API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update announcement visibility
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { announcement_id, is_visible } = body

    if (!announcement_id || typeof is_visible !== 'boolean') {
      return NextResponse.json(
        { error: 'Announcement ID and visibility status are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('intramurals_announcements')
      .update({ 
        is_visible,
        updated_at: new Date().toISOString()
      })
      .eq('id', announcement_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating announcement:', error)
      return NextResponse.json(
        { error: 'Failed to update announcement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      announcement: data,
      message: `Announcement ${is_visible ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('Error in update announcement API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove announcement
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
    const announcementId = searchParams.get('id')

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('intramurals_announcements')
      .delete()
      .eq('id', announcementId)

    if (error) {
      console.error('Error deleting announcement:', error)
      return NextResponse.json(
        { error: 'Failed to delete announcement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Announcement deleted successfully'
    })
  } catch (error) {
    console.error('Error in delete announcement API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
