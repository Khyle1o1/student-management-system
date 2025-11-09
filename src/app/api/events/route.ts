import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  date: z.string().min(1),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  // Accept UI enum (COLLEGE/COURSE) and DB enum (COLLEGE_WIDE/COURSE_SPECIFIC)
  scope_type: z.enum(['UNIVERSITY_WIDE','COLLEGE','COURSE','COLLEGE_WIDE','COURSE_SPECIFIC']),
  scope_college: z.string().optional().nullable(),
  scope_course: z.string().optional().nullable(),
  attendance_type: z.enum(['IN_ONLY', 'IN_OUT']).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (!['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = eventSchema.parse(body)
    const normalizedScope = data.scope_type === 'COLLEGE' ? 'COLLEGE_WIDE'
      : data.scope_type === 'COURSE' ? 'COURSE_SPECIFIC'
      : data.scope_type

    const isAdmin = role === 'ADMIN'
    const isCollegeOrg = role === 'COLLEGE_ORG'
    const isCourseOrg = role === 'COURSE_ORG'

    // Validate scope for orgs
    if (isCollegeOrg || isCourseOrg) {
      if (normalizedScope === 'UNIVERSITY_WIDE') {
        return NextResponse.json({ error: 'Only Admin can create university-wide events' }, { status: 403 })
      }
      if (normalizedScope === 'COLLEGE_WIDE') {
        if (!data.scope_college || data.scope_college !== session.user.assigned_college) {
          return NextResponse.json({ error: 'College must match your assigned college' }, { status: 403 })
        }
      }
      if (normalizedScope === 'COURSE_SPECIFIC') {
        if (!data.scope_college || data.scope_college !== session.user.assigned_college) {
          return NextResponse.json({ error: 'College must match your assigned college' }, { status: 403 })
        }
        const assignedCourses: string[] = (session.user as any).assigned_courses || (session.user.assigned_course ? [session.user.assigned_course] : [])
        if (!data.scope_course || !assignedCourses.includes(data.scope_course)) {
          return NextResponse.json({ error: 'Course must be one of your assigned courses' }, { status: 403 })
        }
      }
    }

    // Pending approval status for org-created events
    const status = isAdmin ? 'APPROVED' : 'PENDING'

    const { data: event, error } = await supabaseAdmin
      .from('events')
      .insert([{
        title: data.title,
        description: data.description || null,
        date: data.date,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        location: data.location || null,
        scope_type: normalizedScope,
        scope_college: data.scope_college || null,
        scope_course: data.scope_course || null,
        attendance_type: data.attendance_type || 'IN_ONLY',
        status,
      }])
      .select('*')
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    if (!isAdmin) {
      // Log pending approval for Admins to see
      const actor = session.user
      await supabaseAdmin.from('notifications').insert({
        user_id: actor.id,
        type: 'SYSTEM_ACTIVITY',
        title: 'Event awaiting approval',
        message: `${actor.role} ${actor.name || ''} created an event ("${(event as any)?.title}") pending admin approval`,
        data: {
          action: 'EVENT_CREATED_PENDING',
          event_id: (event as any)?.id,
          scope_type: (event as any)?.scope_type,
          scope_college: (event as any)?.scope_college,
          scope_course: (event as any)?.scope_course,
        },
        is_read: true,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in POST /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

 

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = session.user.role
    const isAdmin = role === 'ADMIN'
    const isCollegeOrg = role === 'COLLEGE_ORG'
    const isCourseOrg = role === 'COURSE_ORG'
    if (!(isAdmin || isCollegeOrg || isCourseOrg)) {
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
    let eventsQuery = supabaseAdmin
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
        status,
        require_evaluation,
        attendance_type,
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

    // Scope filtering for org roles
    if (isCollegeOrg) {
      eventsQuery = eventsQuery.or(
        `and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${session.user.assigned_college}),and(scope_type.eq.COURSE_SPECIFIC,scope_college.eq.${session.user.assigned_college})`
      )
    } else if (isCourseOrg) {
      const course = session.user.assigned_course || ''
      eventsQuery = eventsQuery
        .eq('scope_type', 'COURSE_SPECIFIC')
        .eq('scope_college', session.user.assigned_college || '')
        .eq('scope_course', course)
    }

    const { data: events, error } = await eventsQuery

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Transform events to match expected format with defaults for missing fields
    const transformedEvents = await Promise.all(events?.map(async (event) => {
      // Fetch attendance statistics for this event
      let attendanceStats = null
      try {
        // Get total eligible students based on scope
        // Use head: true to only get count without fetching data
        let eligibleStudentsQuery = supabaseAdmin
          .from('students')
          .select('*', { count: 'exact', head: true })
        
        if (event.scope_type === 'COLLEGE_WIDE' && event.scope_college) {
          eligibleStudentsQuery = eligibleStudentsQuery.eq('college', event.scope_college)
        } else if (event.scope_type === 'COURSE_SPECIFIC' && event.scope_course) {
          eligibleStudentsQuery = eligibleStudentsQuery.eq('course', event.scope_course)
        }

        const { count: totalEligible } = await eligibleStudentsQuery

        // Get attendance records for this event
        // Use limit to fetch all records (Supabase default is 1000)
        const { data: attendanceRecords } = await supabaseAdmin
          .from('attendance')
          .select('id, time_in, time_out, student_id, created_at')
          .eq('event_id', event.id)
          .limit(10000)

        // Group records by student_id to get the latest record for each student
        const studentRecords = new Map()
        
        attendanceRecords?.forEach(record => {
          const studentId = record.student_id
          if (!studentRecords.has(studentId) || 
              new Date(record.created_at) > new Date(studentRecords.get(studentId).created_at)) {
            studentRecords.set(studentId, record)
          }
        })

        // Count students with complete attendance based on attendance_type
        const uniqueStudentRecords = Array.from(studentRecords.values())
        const attendanceType = event.attendance_type || 'IN_ONLY'
        
        const totalPresent = uniqueStudentRecords.filter(record => {
          if (attendanceType === 'IN_OUT') {
            // For IN_OUT events, require both time_in and time_out
            return record.time_in !== null && record.time_out !== null
          } else {
            // For IN_ONLY events, only require time_in
            return record.time_in !== null
          }
        }).length

        const attendanceRate = totalEligible && totalEligible > 0 
          ? Math.round((totalPresent / totalEligible) * 100) 
          : 0

        attendanceStats = {
          total_present: totalPresent,
          total_eligible: totalEligible || 0,
          attendance_rate: attendanceRate
        }
      } catch (error) {
        console.error('Error fetching attendance stats for event:', event.id, error)
        // Continue without attendance stats
      }

      return {
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
        registeredCount: attendanceStats?.total_present || 0,
        status: event.status || (() => {
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
        attendance_type: event.attendance_type || "IN_ONLY",
        attendance_stats: attendanceStats,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      }
    }) || [])

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
// (Removed duplicate legacy POST implementation)