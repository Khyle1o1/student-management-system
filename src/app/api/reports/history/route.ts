import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow all administrative roles to access report history
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get user's role for filtering
    const userRole = session.user.role
    const userCollege = session.user.assigned_college
    const userCourse = session.user.assigned_course

    // Construct a list of available reports based on actual data
    const reports = []

    // 1. Get recent events (for event reports)
    let eventsQuery = supabaseAdmin
      .from('events')
      .select('id, title, date, created_at, scope_type, scope_college, scope_course')
      .order('created_at', { ascending: false })
      .limit(10)

    // Apply role-based filtering
    if (userRole === 'COLLEGE_ORG' && userCollege) {
      eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
    } else if (userRole === 'COURSE_ORG') {
      if (userCollege && userCourse) {
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        eventsQuery = eventsQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      }
    }

    const { data: events } = await eventsQuery

    // Add event reports to the list
    for (const event of events || []) {
      reports.push({
        id: `event_${event.id}`,
        title: `${event.title} - Attendance Report`,
        type: 'attendance',
        generatedAt: event.created_at,
        generatedBy: 'System',
        downloadUrl: `/api/events/${event.id}/report`,
        metadata: {
          eventDate: event.date,
          eventId: event.id
        }
      })
    }

    // 2. Get recent fees (for fee reports)
    let feesQuery = supabaseAdmin
      .from('fee_structures')
      .select('id, name, amount, created_at, scope_type, scope_college, scope_course')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    // Apply role-based filtering for fees
    if (userRole === 'COLLEGE_ORG' && userCollege) {
      feesQuery = feesQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
    } else if (userRole === 'COURSE_ORG') {
      if (userCollege && userCourse) {
        feesQuery = feesQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
      } else if (userCollege) {
        feesQuery = feesQuery.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
      }
    }

    const { data: fees } = await feesQuery

    // Add fee reports to the list
    for (const fee of fees || []) {
      reports.push({
        id: `fee_${fee.id}`,
        title: `${fee.name} - Payment Report`,
        type: 'financial',
        generatedAt: fee.created_at,
        generatedBy: 'System',
        downloadUrl: `/api/fees/${fee.id}/report/pdf`,
        metadata: {
          feeAmount: fee.amount,
          feeId: fee.id
        }
      })
    }

    // 3. Add summary reports (always available)
    const now = new Date()
    const summaryReports = [
      {
        id: 'events_summary',
        title: 'Event Summary Report',
        type: 'attendance',
        generatedAt: now.toISOString(),
        generatedBy: session.user.name || session.user.email,
        downloadUrl: '/api/reports/events-summary/pdf',
        metadata: {
          reportType: 'summary'
        }
      },
      {
        id: 'fees_summary',
        title: 'Fees Summary Report',
        type: 'financial',
        generatedAt: now.toISOString(),
        generatedBy: session.user.name || session.user.email,
        downloadUrl: '/api/reports/fees-summary/pdf',
        metadata: {
          reportType: 'summary'
        }
      }
    ]

    // Combine all reports and sort by date
    const allReports = [...summaryReports, ...reports]
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 20) // Limit to 20 most recent

    // Calculate summary statistics
    const totalReports = allReports.length
    const reportsByType = {
      attendance: allReports.filter(r => r.type === 'attendance').length,
      financial: allReports.filter(r => r.type === 'financial').length,
      students: allReports.filter(r => r.type === 'students').length
    }

    return NextResponse.json({
      reports: allReports,
      summary: {
        total: totalReports,
        byType: reportsByType,
        latestDate: allReports[0]?.generatedAt || now.toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching report history:', error)
    return NextResponse.json({ error: 'Failed to fetch report history' }, { status: 500 })
  }
}

