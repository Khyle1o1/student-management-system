import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: students, error } = await supabase
      .from('students')
      .select(`
        *,
        user:users(
          id,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // Transform data for export
    const exportData = students.map(student => ({
      'Student ID': student.student_id,
      'Name': student.name,
      'Email': student.email,
      'Phone': student.phone || '',
      'College': student.college,
      'Course': student.course,
      'Year Level': student.year_level,
      'Created At': new Date(student.created_at).toLocaleDateString()
    }))

    return NextResponse.json(exportData)

  } catch (error) {
    console.error('Error in GET /api/students/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 