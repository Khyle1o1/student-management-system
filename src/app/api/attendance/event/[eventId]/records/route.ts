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
    // Fetch ALL records using pagination to bypass Supabase's hard limit
    let allAttendanceRecords: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1
      
      const { data: pageRecords, error: recordsError } = await supabaseAdmin
        .from('attendance')
        .select(`
          id,
          time_in,
          time_out,
          mode,
          status,
          created_at,
          student:students (
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
        .range(from, to)

      if (recordsError) {
        console.error('Error fetching attendance records:', recordsError)
        return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
      }

      if (pageRecords && pageRecords.length > 0) {
        allAttendanceRecords = allAttendanceRecords.concat(pageRecords)
        hasMore = pageRecords.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    const attendanceRecords = allAttendanceRecords
    console.log('Fetched attendance records for display (with pagination):', attendanceRecords?.length || 0)

    // Transform the data to match the expected format
    const transformedRecords = attendanceRecords?.map(record => {
      // Handle the student data properly - it should be a single object
      const student = record.student
      
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