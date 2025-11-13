import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { startOfMonth, endOfMonth } from "date-fns"

export const dynamic = "force-dynamic"

const ALLOWED_ROLES = ['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG']

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role as string
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const monthParam = searchParams.get("month")

    let referenceDate = new Date()
    if (monthParam) {
      const parsed = new Date(`${monthParam}-01T00:00:00`)
      if (!isNaN(parsed.getTime())) {
        referenceDate = parsed
      }
    }

    const rangeStart = startOfMonth(referenceDate)
    const rangeEnd = endOfMonth(referenceDate)
    const startIso = rangeStart.toISOString()
    const endIso = rangeEnd.toISOString()

    const userCollege = (session.user as any)?.assigned_college as string | null
    const userCourse = (session.user as any)?.assigned_course as string | null
    const assignedCourses: string[] =
      ((session.user as any)?.assigned_courses as string[] | undefined) ??
      (userCourse ? [userCourse] : [])

    const applyEventScope = (query: any) => {
      if (role === 'COLLEGE_ORG' && userCollege) {
        return query
          .eq('scope_type', 'COLLEGE_WIDE')
          .eq('scope_college', userCollege)
      }
      if (role === 'COURSE_ORG' && assignedCourses.length > 0) {
        return query
          .eq('scope_type', 'COURSE_SPECIFIC')
          .in('scope_course', assignedCourses)
      }
      return query
    }

    const applyFeeScope = (query: any) => {
      if (role === 'COLLEGE_ORG' && userCollege) {
        return query
          .eq('scope_type', 'COLLEGE_WIDE')
          .eq('scope_college', userCollege)
      }
      if (role === 'COURSE_ORG' && assignedCourses.length > 0) {
        return query
          .eq('scope_type', 'COURSE_SPECIFIC')
          .in('scope_course', assignedCourses)
      }
      return query
    }

    const [{ data: eventsData, error: eventsError }, { data: feesData, error: feesError }, { data: evaluationsData, error: evaluationsError }] =
      await Promise.all([
        applyEventScope(
          supabaseAdmin
            .from('events')
            .select('id,title,date,start_time,end_time,location,status,scope_type,scope_college,scope_course')
            .gte('date', startIso)
            .lte('date', endIso)
            .order('date', { ascending: true })
        ),
        applyFeeScope(
          supabaseAdmin
            .from('fee_structures')
            .select('id,name,due_date,amount,scope_type,scope_college,scope_course')
            .gte('due_date', startIso)
            .lte('due_date', endIso)
            .order('due_date', { ascending: true })
        ),
        (() => {
          let query = supabaseAdmin
            .from('evaluation_forms')
            .select('id,title,closes_at,status,created_by')
            .not('closes_at', 'is', null)
            .gte('closes_at', startIso)
            .lte('closes_at', endIso)
            .order('closes_at', { ascending: true })

          if (role !== 'ADMIN') {
            query = query.eq('created_by', session.user.id)
          }

          return query
        })(),
      ])

    if (eventsError) {
      console.error('Calendar events error:', eventsError)
    }
    if (feesError) {
      console.error('Calendar fees error:', feesError)
    }
    if (evaluationsError) {
      console.error('Calendar evaluations error:', evaluationsError)
    }

    const items: Array<{
      id: string
      type: 'event' | 'fee' | 'evaluation'
      title: string
      date: string
      start_time?: string | null
      end_time?: string | null
      location?: string | null
      amount?: number | null
      status?: string | null
    }> = []

    eventsData?.forEach((event) => {
      if (!event?.date) return
      items.push({
        id: event.id,
        type: 'event',
        title: event.title,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        status: event.status,
      })
    })

    feesData?.forEach((fee) => {
      if (!fee?.due_date) return
      items.push({
        id: fee.id,
        type: 'fee',
        title: fee.name,
        date: fee.due_date,
        amount: fee.amount,
      })
    })

    evaluationsData?.forEach((form) => {
      if (!form?.closes_at) return
      items.push({
        id: form.id,
        type: 'evaluation',
        title: form.title,
        date: form.closes_at,
        status: form.status,
      })
    })

    return NextResponse.json({
      items,
      range: {
        start: startIso,
        end: endIso,
      },
    })
  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return NextResponse.json({ error: "Failed to fetch calendar data" }, { status: 500 })
  }
}

