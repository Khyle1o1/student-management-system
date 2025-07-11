import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { z } from "zod"

// Temporary schema that works with current database (before complete migration)
const tempEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  scope_type: z.enum(["UNIVERSITY_WIDE", "COLLEGE_WIDE", "COURSE_SPECIFIC"]).optional(),
  scope_college: z.string().optional(),
  scope_course: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // Get total count for pagination
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .ilike('title', `%${search}%`)

    // Get paginated events
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        date,
        start_time,
        end_time,
        location,
        type,
        max_capacity,
        scope_type,
        scope_college,
        scope_course,
        created_at,
        updated_at
      `)
      .ilike('title', `%${search}%`)
      .range(offset, offset + limit - 1)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Transform events to match expected format with defaults for missing fields
    const transformedEvents = events?.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      eventDate: event.date.split('T')[0],
      startTime: event.start_time || "09:00",
      endTime: event.end_time || "17:00",
      location: event.location || "TBD",
      type: event.type || "ACADEMIC",
      max_capacity: event.max_capacity || 100,
      eventType: event.type || "ACADEMIC",
      capacity: event.max_capacity || 100,
      registeredCount: 0, // TODO: Calculate actual count
      status: new Date(event.date) > new Date() ? "upcoming" : "completed",
      scope_type: event.scope_type || "UNIVERSITY_WIDE",
      scope_college: event.scope_college || "",
      scope_course: event.scope_course || "",
      createdAt: event.created_at,
      updatedAt: event.updated_at
    })) || []

    return NextResponse.json({
      events: transformedEvents,
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    console.log("Received event data:", body)

    // Create date-time string from the form data
    const eventDateTime = `${body.date}T${body.startTime || '09:00'}:00.000Z`

    // Use temporary schema that works with current database (no location field)
    const data = tempEventSchema.parse({
      title: body.title,
      description: body.description,
      date: eventDateTime,
      scope_type: body.scope_type || "UNIVERSITY_WIDE",
      scope_college: body.scope_type !== "UNIVERSITY_WIDE" ? body.scope_college : undefined,
      scope_course: body.scope_type === "COURSE_SPECIFIC" ? body.scope_course : undefined,
    })

    // Insert all fields that should exist in database
    const insertData = {
      title: data.title,
      description: data.description || null,
      date: data.date,
      start_time: body.startTime || '09:00',
      end_time: body.endTime || '17:00',
      location: body.location || 'TBD',
      type: body.type || 'ACADEMIC',
      max_capacity: body.max_capacity || 100,
      scope_type: data.scope_type || 'UNIVERSITY_WIDE',
      scope_college: data.scope_college || null,
      scope_course: data.scope_course || null
    }

    console.log("Inserting event data:", insertData)

    const { data: event, error } = await supabase
      .from('events')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      
      // Provide helpful error message if columns are missing
      if (error.message.includes("Could not find") && error.message.includes("column")) {
        return NextResponse.json({ 
          error: 'Database schema incomplete. Some columns are missing from the events table.',
          details: 'Please apply the complete migration or add missing columns.',
          missingColumn: error.message.match(/'(\w+)'/)?.[1] || 'unknown'
        }, { status: 500 })
      }
      
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json(event, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 