import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params

    // Check if event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    // Get all attendance records for this event
    const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select('id, time_in, time_out, mode')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError)
      return NextResponse.json({ error: 'Failed to fetch attendance statistics' }, { status: 500 })
    }

    // Calculate statistics based on new attendance policy
    // Students are only considered "present" when they have both signed in AND signed out
    const totalPresent = attendanceRecords?.filter(record => 
      record.time_in !== null && record.time_out !== null
    ).length || 0
    
    const signedInOnly = attendanceRecords?.filter(record => 
      record.time_in !== null && record.time_out === null
    ).length || 0
    
    const totalSignedIn = attendanceRecords?.filter(record => record.time_in !== null).length || 0

    return NextResponse.json({
      totalPresent,        // Students who completed full attendance (signed in + out)
      signedInOnly,       // Students who signed in but haven't signed out yet
      totalSignedIn,      // Total students who have signed in
      totalRecords: attendanceRecords?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/attendance/event/[eventId]/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 