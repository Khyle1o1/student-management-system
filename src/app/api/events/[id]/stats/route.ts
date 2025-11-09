import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
    console.log('Getting stats for event ID:', id)
    
    // First get the event details to determine scope
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    if (!event) {
      console.error('Event not found with ID:', id)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get total eligible students based on scope
    // Use count with head: true to avoid fetching data, just get the count
    let eligibleStudentsQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
    
    if (event.scope_type === 'COLLEGE_WIDE' && event.scope_college) {
      eligibleStudentsQuery = eligibleStudentsQuery.eq('college', event.scope_college)
    } else if (event.scope_type === 'COURSE_SPECIFIC' && event.scope_course) {
      eligibleStudentsQuery = eligibleStudentsQuery.eq('course', event.scope_course)
    }

    const { count: totalEligible, error: countError } = await eligibleStudentsQuery
    
    console.log('Total eligible students count:', totalEligible)

    if (countError) {
      console.error('Error counting eligible students:', countError)
      return NextResponse.json({ error: 'Failed to count eligible students' }, { status: 500 })
    }

    // Get attendance count using the correct attendance table
    // Count students who have both signed in AND signed out (complete attendance)
    // Fetch ALL records by using a large limit to bypass Supabase's 1000 row default
    const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select('id, time_in, time_out, student_id, created_at')
      .eq('event_id', id)
      .limit(10000) // Set a high limit to get all records

    if (attendanceError) {
      console.error('Error counting attendance:', attendanceError)
      return NextResponse.json({ error: 'Failed to count attendance' }, { status: 500 })
    }

    console.log('Fetched attendance records count:', attendanceRecords?.length || 0)

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
    
    const attended = uniqueStudentRecords.filter(record => {
      if (attendanceType === 'IN_OUT') {
        // For IN_OUT events, require both time_in and time_out
        return record.time_in !== null && record.time_out !== null
      } else {
        // For IN_ONLY events, only require time_in
        return record.time_in !== null
      }
    }).length

    return NextResponse.json({
      total_eligible: totalEligible || 0,
      attended: attended || 0,
      percentage: totalEligible ? Math.round((attended || 0) / totalEligible * 100) : 0,
      scope_type: event.scope_type,
      scope_details: {
        college: event.scope_college,
        course: event.scope_course
      }
    })

  } catch (error) {
    console.error('Error in GET /api/events/[id]/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 