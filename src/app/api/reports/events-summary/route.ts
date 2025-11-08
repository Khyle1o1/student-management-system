import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url)
    const college = searchParams.get('college')
    const course = searchParams.get('course')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build events query with filters
    let eventsQuery = supabaseAdmin
      .from('events')
      .select('id, title, date, scope_type, scope_college, scope_course')
      .order('date', { ascending: false })

    // Apply role-based filtering based on user's assigned college/course
    if (session.user.role === 'COLLEGE_ORG') {
      const userCollege = session.user.assigned_college
      if (userCollege) {
        // COLLEGE_ORG can see: UNIVERSITY_WIDE events and events for their assigned college
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      } else {
        // If no college assigned, only show UNIVERSITY_WIDE
        eventsQuery = eventsQuery.eq('scope_type', 'UNIVERSITY_WIDE')
      }
    } else if (session.user.role === 'COURSE_ORG') {
      const userCollege = session.user.assigned_college
      const userCourse = session.user.assigned_course
      if (userCollege && userCourse) {
        // COURSE_ORG can see: UNIVERSITY_WIDE, their college's events, and their course's events
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        // If only college assigned, show UNIVERSITY_WIDE and college events
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      } else {
        // If no assignments, only show UNIVERSITY_WIDE
        eventsQuery = eventsQuery.eq('scope_type', 'UNIVERSITY_WIDE')
      }
    }
    // ADMIN has no restrictions - sees all events

    // Apply user filters
    if (college) {
      eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,scope_college.eq.${college}`)
    }
    if (course) {
      eventsQuery = eventsQuery.eq('scope_course', course)
    }
    if (dateFrom) {
      eventsQuery = eventsQuery.gte('date', dateFrom)
    }
    if (dateTo) {
      eventsQuery = eventsQuery.lte('date', dateTo)
    }

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // For each event, get attendance statistics
    const eventsWithStats = await Promise.all(
      (events || []).map(async (event) => {
        // Get all students eligible for this event based on scope using pagination
        let allEligibleStudents: any[] = []
        let studentsPage = 0
        const studentsPageSize = 1000
        let hasMoreStudents = true

        while (hasMoreStudents) {
          let studentsQuery = supabaseAdmin
            .from('students')
            .select('id')
            .range(studentsPage * studentsPageSize, (studentsPage + 1) * studentsPageSize - 1)

          if (event.scope_type === 'COLLEGE_WIDE' && event.scope_college) {
            studentsQuery = studentsQuery.eq('college', event.scope_college)
          } else if (event.scope_type === 'COURSE_SPECIFIC' && event.scope_course) {
            studentsQuery = studentsQuery.eq('course', event.scope_course)
          }

          const { data: studentsData, error: studentsError } = await studentsQuery

          if (studentsError) {
            console.error('Error fetching students for event:', studentsError)
            break
          }

          if (studentsData && studentsData.length > 0) {
            allEligibleStudents = allEligibleStudents.concat(studentsData)
            hasMoreStudents = studentsData.length === studentsPageSize
            studentsPage++
          } else {
            hasMoreStudents = false
          }
        }

        const totalStudents = allEligibleStudents.length

        // Get attendance records for this event using pagination
        let allAttendance: any[] = []
        let attendancePage = 0
        const attendancePageSize = 1000
        let hasMoreAttendance = true

        while (hasMoreAttendance) {
          const { data: attendanceData, error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .select('id, student_id, status')
            .eq('event_id', event.id)
            .in('status', ['PRESENT', 'LATE'])
            .range(attendancePage * attendancePageSize, (attendancePage + 1) * attendancePageSize - 1)

          if (attendanceError) {
            console.error('Error fetching attendance:', attendanceError)
            break
          }

          if (attendanceData && attendanceData.length > 0) {
            allAttendance = allAttendance.concat(attendanceData)
            hasMoreAttendance = attendanceData.length === attendancePageSize
            attendancePage++
          } else {
            hasMoreAttendance = false
          }
        }

        const studentsAttended = allAttendance.length
        const attendanceRate = totalStudents > 0 ? (studentsAttended / totalStudents) * 100 : 0

        return {
          id: event.id,
          eventName: event.title,
          date: event.date,
          totalStudents,
          studentsAttended,
          attendanceRate: Math.round(attendanceRate * 10) / 10
        }
      })
    )

    // Calculate overall statistics
    const totalEvents = eventsWithStats.length
    const totalAttendanceRecords = eventsWithStats.reduce((sum, event) => sum + event.studentsAttended, 0)
    const totalPossibleAttendance = eventsWithStats.reduce((sum, event) => sum + event.totalStudents, 0)
    const overallAttendanceRate = totalPossibleAttendance > 0 
      ? Math.round((totalAttendanceRecords / totalPossibleAttendance) * 100 * 10) / 10
      : 0

    return NextResponse.json({
      events: eventsWithStats,
      summary: {
        totalEvents,
        totalAttendanceRecords,
        totalPossibleAttendance,
        overallAttendanceRate
      }
    })
  } catch (error) {
    console.error('Error in GET /api/reports/events-summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

