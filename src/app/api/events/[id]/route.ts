import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Transform the data to match the frontend format
    const eventDate = new Date(event.date)
    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      eventDate: format(eventDate, 'yyyy-MM-dd'),
      startTime: format(eventDate, 'HH:mm'),
      endTime: format(new Date(eventDate.getTime() + 3 * 60 * 60 * 1000), 'HH:mm'), // Add 3 hours by default
      location: event.location || '',
      scope_type: event.scope_type || 'UNIVERSITY_WIDE',
      scope_college: event.scope_college || null,
      scope_course: event.scope_course || null
    }

    return NextResponse.json(transformedEvent)
  } catch (error) {
    console.error('Error in GET /api/events/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    const updateData = {
      title: body.title,
      description: body.description || null,
      date: body.eventDate,
      location: body.location || null,
      scope_type: body.scope_type || 'UNIVERSITY_WIDE',
      scope_college: body.scope_college || null,
      scope_course: body.scope_course || null,
      updated_at: new Date().toISOString()
    }

    const { data: event, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error in PUT /api/events/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = params

    // Check if event exists
    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to check event' }, { status: 500 })
    }

    // Delete the event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Event deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/events/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 