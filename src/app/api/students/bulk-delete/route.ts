import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { z } from "zod"

const bulkDeleteSchema = z.object({
  student_ids: z.array(z.string())
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { student_ids } = bulkDeleteSchema.parse(body)

    // Get all students to be deleted
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('id, user_id')
      .in('student_id', student_ids)

    if (fetchError) {
      console.error('Error fetching students:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students found' }, { status: 404 })
    }

    // Delete student records
    const { error: deleteStudentsError } = await supabase
      .from('students')
      .delete()
      .in('id', students.map(s => s.id))

    if (deleteStudentsError) {
      console.error('Error deleting students:', deleteStudentsError)
      return NextResponse.json({ error: 'Failed to delete students' }, { status: 500 })
    }

    // Delete associated user records
    const { error: deleteUsersError } = await supabase
      .from('users')
      .delete()
      .in('id', students.map(s => s.user_id))

    if (deleteUsersError) {
      console.error('Error deleting users:', deleteUsersError)
      return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully deleted ${students.length} students`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/students/bulk-delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 