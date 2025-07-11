import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  college: z.string().min(1),
  year_level: z.number().min(1),
  course: z.string().min(1)
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

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
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', error)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    return NextResponse.json(student)

  } catch (error) {
    console.error('Error in GET /api/students/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const data = updateStudentSchema.parse(body)

    // Check if student exists
    const { data: existingStudent, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Check if email is already taken by another student
    if (data.email !== existingStudent.email) {
      const { data: emailCheck } = await supabase
        .from('students')
        .select('id')
        .eq('email', data.email)
        .neq('id', id)
        .single()

      if (emailCheck) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 400 })
      }
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
      .eq('id', id)
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

    // Update associated user record
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        email: data.email,
        name: data.name
      })
      .eq('id', existingStudent.user_id)

    if (userUpdateError) {
      console.error('Error updating user:', userUpdateError)
      // Rollback student update
      await supabase
        .from('students')
        .update(existingStudent)
        .eq('id', id)

      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json(updatedStudent)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in PUT /api/students/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if student exists
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Delete student record
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting student:', deleteError)
      return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
    }

    // Delete associated user record
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', student.user_id)

    if (userDeleteError) {
      console.error('Error deleting user:', userDeleteError)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Error in DELETE /api/students/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 