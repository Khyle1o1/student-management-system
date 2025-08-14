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
    // First get the event details to determine scope
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    // Get total eligible students based on scope
    let eligibleStudentsQuery = supabase.from('students').select('id', { count: 'exact' })
    
    if (event.scope_type === 'COLLEGE_WIDE' && event.scope_college) {
      eligibleStudentsQuery = eligibleStudentsQuery.eq('college', event.scope_college)
    } else if (event.scope_type === 'COURSE_SPECIFIC' && event.scope_course) {
      eligibleStudentsQuery = eligibleStudentsQuery.eq('course', event.scope_course)
    }

    const { count: totalEligible, error: countError } = await eligibleStudentsQuery

    if (countError) {
      console.error('Error counting eligible students:', countError)
      return NextResponse.json({ error: 'Failed to count eligible students' }, { status: 500 })
    }

    // Get attendance count
    const { count: attended, error: attendanceError } = await supabase
      .from('event_attendance')
      .select('*', { count: 'exact' })
      .eq('event_id', id)

    if (attendanceError) {
      console.error('Error counting attendance:', attendanceError)
      return NextResponse.json({ error: 'Failed to count attendance' }, { status: 500 })
    }

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