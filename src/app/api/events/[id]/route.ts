import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Return the event data with consistent field names
    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      date: event.date, // Keep the original date field
      start_time: event.start_time || '09:00', // Use the start_time field
      end_time: event.end_time || '17:00', // Use the end_time field
      location: event.location || '',
      type: event.type || 'ACADEMIC',
      max_capacity: event.max_capacity || 100,
      scope_type: event.scope_type || 'UNIVERSITY_WIDE',
      scope_college: event.scope_college || null,
      scope_course: event.scope_course || null,
      require_evaluation: event.require_evaluation || false,
      created_at: event.created_at,
      updated_at: event.updated_at
    }

    return NextResponse.json(transformedEvent)
  } catch (error) {
    console.error('Error in GET /api/events/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
      date: body.date || body.eventDate, // Support both field names for backward compatibility
      start_time: body.start_time || body.startTime || '09:00', // Support both field names
      end_time: body.end_time || body.endTime || '17:00', // Support both field names
      location: body.location || null,
      type: body.type || 'ACADEMIC',
      max_capacity: body.max_capacity || 100,
      scope_type: body.scope_type || 'UNIVERSITY_WIDE',
      scope_college: body.scope_college || null,
      scope_course: body.scope_course || null,
      require_evaluation: body.require_evaluation || false,
      updated_at: new Date().toISOString()
    }

    const { id } = await params
    const { data: event, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

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