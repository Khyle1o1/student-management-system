import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { z } from "zod"

// Temporary schema that works with current database (before complete migration)
const tempEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  scope_type: z.enum(["UNIVERSITY_WIDE", "COLLEGE_WIDE", "COURSE_SPECIFIC"]).optional(),
  scope_college: z.string().optional(),
  scope_course: z.string().optional(),
  require_evaluation: z.boolean().optional(),
  evaluation_id: z.string().optional(), // ID of the evaluation to link
  certificate_template_id: z.string().optional(), // ID of the certificate template to link
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // Get total count for pagination
    const { count } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .ilike('title', `%${search}%`)

    // Get paginated events with evaluation info
    const { data: events, error } = await supabaseAdmin
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
        require_evaluation,
        created_at,
        updated_at,
        event_evaluation:event_evaluations(
          id,
          is_required,
          evaluation:evaluations(
            id,
            title,
            description
          )
        )
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
      status: (() => {
        try {
          let eventDate: Date
          if (event.date.includes('T')) {
            eventDate = new Date(event.date)
          } else {
            eventDate = new Date(event.date + 'T00:00:00')
          }
          
          if (isNaN(eventDate.getTime())) {
            return "error"
          }
          
          return eventDate > new Date() ? "upcoming" : "completed"
        } catch (error) {
          console.error('Error parsing event date:', error)
          return "error"
        }
      })(),
      scope_type: event.scope_type || "UNIVERSITY_WIDE",
      scope_college: event.scope_college || "",
      scope_course: event.scope_course || "",
      require_evaluation: event.require_evaluation || false,
      evaluation: event.event_evaluation?.[0]?.evaluation || null,
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

    // Don't combine date and time - store them separately to avoid timezone issues
    const eventDate = body.date // Keep just the date part (e.g., "2024-07-15")

    // Use updated schema that includes evaluation support
    const data = tempEventSchema.parse({
      title: body.title,
      description: body.description,
      date: eventDate, // Store just the date without time
      scope_type: body.scope_type || "UNIVERSITY_WIDE",
      scope_college: body.scope_type !== "UNIVERSITY_WIDE" ? body.scope_college : undefined,
      scope_course: body.scope_type === "COURSE_SPECIFIC" ? body.scope_course : undefined,
      require_evaluation: body.require_evaluation || false,
      evaluation_id: body.evaluation_id || undefined,
      certificate_template_id: body.certificate_template_id || undefined,
    })

    // Insert all fields that should exist in database
    const insertData = {
      title: data.title,
      description: data.description || null,
      date: data.date, // Just the date
      start_time: body.startTime || '09:00', // Just the time
      end_time: body.endTime || '17:00', // Just the time
      location: body.location || 'TBD',
      type: body.type || 'ACADEMIC',
      max_capacity: body.max_capacity || 100,
      scope_type: data.scope_type || 'UNIVERSITY_WIDE',
      scope_college: data.scope_college || null,
      scope_course: data.scope_course || null,
      require_evaluation: data.require_evaluation || false
    }

    console.log("Inserting event data:", insertData)

    const { data: event, error } = await supabaseAdmin
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
          details: 'Please apply the certificate_evaluation_migration.sql migration.',
          missingColumn: error.message.match(/'(\w+)'/)?.[1] || 'unknown'
        }, { status: 500 })
      }
      
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    // If evaluation is required and evaluation_id is provided, link them
    if (data.require_evaluation && data.evaluation_id) {
      const { error: linkError } = await supabaseAdmin
        .from('event_evaluations')
        .insert([{
          event_id: event.id,
          evaluation_id: data.evaluation_id,
          is_required: true
        }])

      if (linkError) {
        console.error('Error linking evaluation to event:', linkError)
        // Don't fail the event creation, just log the error
        console.warn('Event created but evaluation link failed. You can link them manually.')
      }
    }

    // If certificate template is provided and certificate_template_id is provided, link them
    if (data.certificate_template_id) {
      const { error: linkError } = await supabaseAdmin
        .from('event_certificate_templates')
        .insert([{
          event_id: event.id,
          certificate_template_id: data.certificate_template_id,
        }])

      if (linkError) {
        console.error('Error linking certificate template to event:', linkError)
        // Don't fail the event creation, just log the error
        console.warn('Event created but certificate template link failed. You can link them manually.')
      }
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