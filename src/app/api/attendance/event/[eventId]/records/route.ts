import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
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
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', eventId)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    // Get attendance records with student details
    const { data: attendanceRecords, error: recordsError } = await supabase
      .from('attendance')
      .select(`
        id,
        time_in,
        time_out,
        mode,
        status,
        created_at,
        students!inner (
          id,
          student_id,
          name,
          email,
          college,
          course
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (recordsError) {
      console.error('Error fetching attendance records:', recordsError)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    // Transform the data to match the expected format
    const transformedRecords = attendanceRecords?.map(record => {
      // Handle the student data properly - it should be a single object
      const student = Array.isArray(record.students) ? record.students[0] : record.students
      
      // Determine status based on time_in and time_out
      // Student is only considered PRESENT if they have both signed in AND signed out
      let recordStatus = "INCOMPLETE"
      if (record.time_in && record.time_out) {
        recordStatus = "PRESENT"
      } else if (record.time_in && !record.time_out) {
        recordStatus = "SIGNED_IN_ONLY"
      }

      return {
        id: record.id,
        studentId: student?.student_id || 'Unknown',
        studentName: student?.name || 'Unknown Student',
        timeIn: record.time_in || record.created_at,
        timeOut: record.time_out,
        status: recordStatus
      }
    }) || []

    return NextResponse.json({
      success: true,
      records: transformedRecords,
      total: transformedRecords.length
    })

  } catch (error) {
    console.error('Error in GET /api/attendance/event/[eventId]/records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 