import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { z } from "zod"
import { getOrgAccessLevelFromSession } from "@/lib/org-permissions"
import { logActivity } from "@/lib/activity-logger"
import { notifyAdminsPendingEvent } from "@/lib/notification-helpers"

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
  certificate_template_id: z.string().optional().nullable(),
  require_evaluation: z.boolean().optional(),
  evaluation_id: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    // ADMIN, EVENTS_STAFF, COLLEGE_ORG, and COURSE_ORG can create events
    if (!['ADMIN','EVENTS_STAFF','COLLEGE_ORG','COURSE_ORG'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = eventSchema.parse(body)
    const normalizedScope = data.scope_type === 'COLLEGE' ? 'COLLEGE_WIDE'
      : data.scope_type === 'COURSE' ? 'COURSE_SPECIFIC'
      : data.scope_type

    const isAdmin = role === 'ADMIN'
    const isEventsStaff = role === 'EVENTS_STAFF'
    const isCollegeOrg = role === 'COLLEGE_ORG'
    const isCourseOrg = role === 'COURSE_ORG'

    const orgAccessLevel = getOrgAccessLevelFromSession(session as any)

    // Finance accounts cannot create events
    if (isCollegeOrg && orgAccessLevel === "finance") {
      return NextResponse.json({ error: 'Forbidden: Finance accounts cannot create events' }, { status: 403 })
    }

    // Events Staff can create events without scope restrictions (like ADMIN)
    // Validate scope for orgs (but not for ADMIN or EVENTS_STAFF)
    if ((isCollegeOrg || isCourseOrg) && !isAdmin && !isEventsStaff) {
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
    // ADMIN and EVENTS_STAFF events are auto-approved
    const status = (isAdmin || isEventsStaff) ? 'APPROVED' : 'PENDING'

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
        require_evaluation: data.require_evaluation || false,
        evaluation_id: data.evaluation_id || null,
        status,
      }])
      .select('*')
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    // Log activity
    await logActivity({
      session,
      action: isAdmin ? "EVENT_CREATED" : "EVENT_CREATED_PENDING",
      module: "events",
      targetType: "event",
      targetId: (event as any)?.id,
      targetName: (event as any)?.title,
      college: (event as any)?.scope_college,
      course: (event as any)?.scope_course,
      details: {
        status: (event as any)?.status,
        scope_type: (event as any)?.scope_type,
      },
    })

    // Link certificate template to event if provided
    if (data.certificate_template_id) {
      const { error: templateLinkError } = await supabaseAdmin
        .from('event_certificate_templates')
        .insert([{
          event_id: event.id,
          certificate_template_id: data.certificate_template_id
        }])

      if (templateLinkError) {
        console.error('Error linking certificate template to event:', templateLinkError)
        // Don't fail the event creation if template linking fails
      } else {
        console.log(`✅ Linked certificate template ${data.certificate_template_id} to event ${event.id}`)
      }
    }

    if (!isAdmin) {
      // Notify all admins about the pending event
      try {
        const { data: admins } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('role', 'ADMIN')

        if (admins && admins.length > 0) {
          const adminNotifications = admins.map(admin => ({
            user_id: admin.id,
            type: 'EVENT_PENDING',
            title: 'New Event Pending Approval',
            message: `${session.user.name || session.user.role} created "${(event as any)?.title}" that requires your approval`,
            data: {
              action: 'EVENT_CREATED_PENDING',
              event_id: (event as any)?.id,
              event_title: (event as any)?.title,
              created_by: session.user.name || session.user.role,
              scope_type: (event as any)?.scope_type,
              scope_college: (event as any)?.scope_college,
              scope_course: (event as any)?.scope_course,
            },
            is_read: false,
            created_at: new Date().toISOString(),
          }))

          await supabaseAdmin.from('notifications').insert(adminNotifications)
        }
      } catch (e) {
        console.warn('Failed to notify admins about pending event:', e)
      }

      // Send email notification to all admins
      try {
        const roleDisplayName = session.user.role === 'COLLEGE_ORG' ? 'College Organization' : 
                                session.user.role === 'COURSE_ORG' ? 'Course Organization' : session.user.role
        
        const eventTime = (event as any)?.start_time 
          ? `${(event as any)?.start_time}${(event as any)?.end_time ? ` - ${(event as any)?.end_time}` : ''}` 
          : 'TBA'
        
        const notificationResult = await notifyAdminsPendingEvent(
          (event as any)?.id,
          (event as any)?.title,
          (event as any)?.date,
          eventTime,
          (event as any)?.location || 'TBA',
          session.user.name || 'Unknown User',
          roleDisplayName,
          (event as any)?.scope_type,
          (event as any)?.scope_college,
          (event as any)?.scope_course
        )

        console.log(`Admin email notifications: ${notificationResult.sent} sent, ${notificationResult.failed} failed`)
      } catch (emailError) {
        // Don't fail event creation if email fails
        console.error('Error sending admin email notifications:', emailError)
      }
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
    const isEventsStaff = role === 'EVENTS_STAFF'
    const isCollegeOrg = role === 'COLLEGE_ORG'
    const isCourseOrg = role === 'COURSE_ORG'

    const orgAccessLevel = getOrgAccessLevelFromSession(session as any)

    // Finance accounts cannot access events list at all
    if (isCollegeOrg && orgAccessLevel === "finance") {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ADMIN, EVENTS_STAFF, and org accounts can access events
    if (!(isAdmin || isEventsStaff || isCollegeOrg || isCourseOrg)) {
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
        evaluation_id,
        attendance_type,
        created_at,
        updated_at
      `)
      .ilike('title', `%${search}%`)
      .range(offset, offset + limit - 1)
      .order('date', { ascending: false })

    // Scope filtering for org roles
    // ADMIN and EVENTS_STAFF see ALL events (no filtering)
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
    // Note: ADMIN and EVENTS_STAFF skip filtering and see all events

    const { data: events, error } = await eventsQuery

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // OPTIMIZATION: Batch fetch all evaluations at once (eliminates N+1 query)
    const evaluationIds = events
      ?.filter(e => e.evaluation_id)
      .map(e => e.evaluation_id)
      .filter(Boolean) || []

    const { data: evaluations } = evaluationIds.length > 0
      ? await supabaseAdmin
          .from('evaluation_forms')
          .select('id, title, description')
          .in('id', evaluationIds)
      : { data: [] }

    const evaluationMap = new Map(evaluations?.map(e => [e.id, e]))

    // OPTIMIZATION: Batch fetch all attendance at once (eliminates N+1 query)
    const eventIds = events?.map(e => e.id) || []

    const { data: allAttendance } = eventIds.length > 0
      ? await supabaseAdmin
          .from('attendance')
          .select('event_id, student_id, time_in, time_out, created_at')
          .in('event_id', eventIds)
          .limit(50000)
      : { data: [] }

    // Group attendance by event in memory
    const attendanceByEvent = new Map()
    allAttendance?.forEach(record => {
      if (!attendanceByEvent.has(record.event_id)) {
        attendanceByEvent.set(record.event_id, [])
      }
      attendanceByEvent.get(record.event_id).push(record)
    })

    // Transform events - NO MORE QUERIES IN LOOP (all data is in memory now)
    const transformedEvents = events?.map((event) => {
      const evaluation = event.evaluation_id ? evaluationMap.get(event.evaluation_id) : null
      const eventAttendance = attendanceByEvent.get(event.id) || []
      
      // Calculate attendance stats from in-memory data
      const studentRecords = new Map<string, any>()
      eventAttendance.forEach((record: any) => {
        const studentId = record.student_id
        if (!studentRecords.has(studentId) || 
            new Date(record.created_at) > new Date(studentRecords.get(studentId).created_at)) {
          studentRecords.set(studentId, record)
        }
      })

      const uniqueStudentRecords = Array.from(studentRecords.values())
      const attendanceType = event.attendance_type || 'IN_ONLY'
      
      const totalPresent = uniqueStudentRecords.filter((record: any) => {
        if (attendanceType === 'IN_OUT') {
          return record.time_in !== null && record.time_out !== null
        } else {
          return record.time_in !== null
        }
      }).length

      const attendanceStats = {
        total_present: totalPresent,
        total_eligible: 0, // Can be calculated separately if needed
        attendance_rate: 0
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
        registeredCount: totalPresent,
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
        evaluation_id: event.evaluation_id || null,
        evaluation: evaluation,
        attendance_type: event.attendance_type || "IN_ONLY",
        attendance_stats: attendanceStats,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      }
    }) || []

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