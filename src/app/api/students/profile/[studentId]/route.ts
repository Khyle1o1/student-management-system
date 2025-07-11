import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  college: z.string().min(1),
  year_level: z.number().min(1),
  course: z.string().min(1)
})

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params

    const { data: student, error } = await supabase
      .from('students')
      .select(`
        *,
        user:users(
          id,
          email,
          name,
          role
        )
      `)
      .eq('student_id', studentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', error)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Map database field names to component expected field names
    const mappedStudent = {
      id: student.id,
      studentId: student.student_id,
      name: student.name,
      email: student.email,
      yearLevel: student.year_level,
      course: student.course,
      enrolledAt: student.created_at,
      user: student.user
    }

    return NextResponse.json(mappedStudent)

  } catch (error) {
    console.error('Error in GET /api/students/profile/[studentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params
    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    // Get existing student to check if email changed
    const { data: existingStudent, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Update student record
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone,
        college: data.college,
        year_level: data.year_level,
        course: data.course,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .select(`
        *,
        user:users(
          id,
          email,
          name,
          role
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating student:', updateError)
      return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
    }

    // Map database field names to component expected field names
    const mappedUpdatedStudent = {
      id: updatedStudent.id,
      studentId: updatedStudent.student_id,
      name: updatedStudent.name,
      email: updatedStudent.email,
      yearLevel: updatedStudent.year_level,
      course: updatedStudent.course,
      enrolledAt: updatedStudent.created_at,
      user: updatedStudent.user
    }

    return NextResponse.json(mappedUpdatedStudent)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in PUT /api/students/profile/[studentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 