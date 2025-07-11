import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = params

    // Check if student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Get attendance records with event details
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        event:events(
          id,
          title,
          description,
          date
        )
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    return NextResponse.json({
      student,
      attendance: attendanceRecords || []
    })

  } catch (error) {
    console.error('Error in GET /api/students/attendance/[studentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 