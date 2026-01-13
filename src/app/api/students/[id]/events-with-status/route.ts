import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

/**
 * GET /api/students/[id]/events-with-status
 * 
 * Fetches ALL events applicable to a student based on their scope (university-wide, college, course)
 * and includes attendance status for each event (ATTENDED, MISSED, or NO_RECORD)
 * 
 * This endpoint addresses the requirement to show both attended AND missed events,
 * not just events with attendance records.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: studentId } = await params
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all' // all, attended, missed

    // Check if student exists - support both UUID (id) and student_id (string identifier)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)
    
    let studentQuery = supabaseAdmin
      .from('students')
      .select('*')
    
    if (isUUID) {
      studentQuery = studentQuery.eq('id', studentId)
    } else {
      studentQuery = studentQuery.eq('student_id', studentId)
    }
    
    const { data: student, error: studentError } = await studentQuery.single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Fetch ALL events applicable to this student based on scope
    // Events are applicable if:
    // 1. UNIVERSITY_WIDE - applies to all students
    // 2. COLLEGE_WIDE - student's college matches
    // 3. COURSE_SPECIFIC - student's college AND course match
    const scopeFilter = `scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq."${student.college}"),and(scope_type.eq.COURSE_SPECIFIC,scope_college.eq."${student.college}",scope_course.eq."${student.course}")`
    
    const { data: applicableEvents, error: eventsError } = await supabaseAdmin
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
        scope_type,
        scope_college,
        scope_course,
        status,
        require_evaluation,
        evaluation_id,
        attendance_type,
        created_at
      `)
      .or(scopeFilter)
      .order('date', { ascending: false })

    if (eventsError) {
      console.error('Error fetching applicable events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Fetch ALL attendance records for this student
    const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select('event_id, status, time_in, time_out, created_at')
      .eq('student_id', student.id)

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    // Create a map of event_id -> attendance record for quick lookup
    const attendanceMap = new Map()
    attendanceRecords?.forEach(record => {
      attendanceMap.set(record.event_id, record)
    })

    // Build events with attendance status
    const eventsWithStatus = applicableEvents?.map(event => {
      const attendanceRecord = attendanceMap.get(event.id)
      
      let attendanceStatus: 'ATTENDED' | 'MISSED' | 'LATE'
      let statusDetails = null

      if (attendanceRecord) {
        // Student has an attendance record for this event
        if (attendanceRecord.status === 'PRESENT') {
          attendanceStatus = 'ATTENDED'
        } else if (attendanceRecord.status === 'LATE') {
          attendanceStatus = 'LATE'
        } else if (attendanceRecord.status === 'ABSENT') {
          attendanceStatus = 'MISSED'
        } else {
          // Handle SIGNED_IN_ONLY or other statuses
          attendanceStatus = attendanceRecord.time_in ? 'ATTENDED' : 'MISSED'
        }
        
        statusDetails = {
          timeIn: attendanceRecord.time_in,
          timeOut: attendanceRecord.time_out,
          recordedAt: attendanceRecord.created_at
        }
      } else {
        // No attendance record = missed event (if event date has passed)
        const eventDate = new Date(event.date)
        const now = new Date()
        
        if (eventDate < now) {
          attendanceStatus = 'MISSED'
        } else {
          // Event hasn't happened yet - don't mark as missed
          return null // We'll filter this out
        }
      }

      return {
        ...event,
        attendanceStatus,
        statusDetails
      }
    }).filter(event => event !== null) || []

    // Apply filter
    let filteredEvents = eventsWithStatus
    if (filter === 'attended') {
      filteredEvents = eventsWithStatus.filter(e => e.attendanceStatus === 'ATTENDED' || e.attendanceStatus === 'LATE')
    } else if (filter === 'missed') {
      filteredEvents = eventsWithStatus.filter(e => e.attendanceStatus === 'MISSED')
    }

    // Calculate statistics
    const totalEvents = eventsWithStatus.length
    const attendedCount = eventsWithStatus.filter(e => 
      e.attendanceStatus === 'ATTENDED' || e.attendanceStatus === 'LATE'
    ).length
    const missedCount = eventsWithStatus.filter(e => e.attendanceStatus === 'MISSED').length
    const attendanceRate = totalEvents > 0 ? Math.round((attendedCount / totalEvents) * 100) : 0

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        college: student.college,
        course: student.course,
        year_level: student.year_level
      },
      events: filteredEvents,
      stats: {
        total: totalEvents,
        attended: attendedCount,
        missed: missedCount,
        attendanceRate
      }
    })

  } catch (error) {
    console.error('Error in GET /api/students/[id]/events-with-status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
