import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = params

    // Check if event exists
    const { data: event, error: eventError } = await supabase
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
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, time_in, time_out, mode')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError)
      return NextResponse.json({ error: 'Failed to fetch attendance statistics' }, { status: 500 })
    }

    // Calculate statistics
    const totalSignedIn = attendanceRecords?.filter(record => record.mode === 'SIGN_IN').length || 0
    const totalSignedOut = attendanceRecords?.filter(record => record.time_out !== null).length || 0
    const currentlyPresent = totalSignedIn - totalSignedOut

    return NextResponse.json({
      totalSignedIn,
      totalSignedOut,
      currentlyPresent,
      totalRecords: attendanceRecords?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/attendance/event/[eventId]/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 