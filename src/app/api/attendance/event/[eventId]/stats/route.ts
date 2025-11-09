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
    console.log('🔥🔥🔥 STATS API CALLED FOR EVENT:', eventId)

    // Check if event exists and get attendance_type
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, attendance_type')
      .eq('id', eventId)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    // Get all attendance records for this event with student information
    // Fetch ALL records using pagination to bypass Supabase's hard limit
    let allAttendanceRecords: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1
      
      const { data: pageRecords, error: attendanceError } = await supabaseAdmin
        .from('attendance')
        .select('id, time_in, time_out, mode, student_id, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .range(from, to)

      if (attendanceError) {
        console.error('Error fetching attendance records:', attendanceError)
        return NextResponse.json({ error: 'Failed to fetch attendance statistics' }, { status: 500 })
      }

      if (pageRecords && pageRecords.length > 0) {
        allAttendanceRecords = allAttendanceRecords.concat(pageRecords)
        hasMore = pageRecords.length === pageSize // Continue if we got a full page
        page++
      } else {
        hasMore = false
      }
    }

    const attendanceRecords = allAttendanceRecords
    console.log('Fetched attendance records for stats (with pagination):', attendanceRecords?.length || 0)

    // Group records by student_id to get the latest record for each student
    const studentRecords = new Map()
    
    attendanceRecords?.forEach(record => {
      const studentId = record.student_id
      if (!studentRecords.has(studentId) || 
          new Date(record.created_at) > new Date(studentRecords.get(studentId).created_at)) {
        studentRecords.set(studentId, record)
      }
    })

    // Calculate statistics based on unique students (latest record per student)
    const uniqueStudentRecords = Array.from(studentRecords.values())
    const attendanceType = event.attendance_type || 'IN_ONLY'
    
    let totalPresent: number
    let signedInOnly: number
    
    if (attendanceType === 'IN_OUT') {
      // For IN_OUT events, require both time_in and time_out
      totalPresent = uniqueStudentRecords.filter(record => 
        record.time_in !== null && record.time_out !== null
      ).length
      
      signedInOnly = uniqueStudentRecords.filter(record => 
        record.time_in !== null && record.time_out === null
      ).length
    } else {
      // For IN_ONLY events, only time_in is required
      totalPresent = uniqueStudentRecords.filter(record => 
        record.time_in !== null
      ).length
      
      // No "signed in only" category for IN_ONLY events since check-in is enough
      signedInOnly = 0
    }
    
    const totalSignedIn = uniqueStudentRecords.filter(record => record.time_in !== null).length

    const result = {
      totalPresent,        // Students who completed attendance (IN_ONLY: signed in, IN_OUT: signed in + out)
      signedInOnly,       // Students who signed in but haven't signed out yet (only for IN_OUT events)
      totalSignedIn,      // Total students who have signed in
      totalRecords: attendanceRecords?.length || 0
    }

    console.log('📊 ATTENDANCE STATS RESULT:', result)
    console.log('   - Raw records fetched:', attendanceRecords?.length || 0)
    console.log('   - Unique students:', uniqueStudentRecords.length)
    console.log('   - Total Signed In:', totalSignedIn)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in GET /api/attendance/event/[eventId]/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 