import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'UNIVERSITY_WIDE'
    const collegeId = searchParams.get('collegeId')
    const courseId = searchParams.get('courseId')

    let query = supabase.from('students').select('id', { count: 'exact' })

    // Apply filters based on scope
    if (scope === 'COLLEGE_WIDE' && collegeId) {
      query = query.eq('college', collegeId)
    } else if (scope === 'COURSE_SPECIFIC' && courseId) {
      query = query.eq('course', courseId)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error fetching student count:', error)
      return NextResponse.json({ error: 'Failed to fetch student count' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Error in GET /api/students/count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 