import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  course: z.string().min(1)
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params

    // Students can only access their own profile
    if (session.user.role === "USER" && session.user.studentId !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: student, error } = await supabaseAdmin
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
    // For students, use the session role (USER) instead of the linked user's role
    const userRole = session.user.role === "USER" || !session.user.isAdminUser 
      ? "USER" 
      : (student.user?.role || session.user.role)
    
    const mappedStudent = {
      id: student.id,
      studentId: student.student_id,
      name: student.name,
      email: student.email,
      yearLevel: `YEAR_${student.year_level}`,
      course: student.course,
      enrolledAt: student.created_at,
      user: {
        id: student.user?.id || session.user.id,
        email: student.user?.email || session.user.email,
        name: student.user?.name || session.user.name,
        role: userRole
      }
    }

    return NextResponse.json(mappedStudent)

  } catch (error) {
    console.error('Error in GET /api/students/profile/[studentId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params

    // Students can only update their own profile
    if (session.user.role === "USER" && session.user.studentId !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    // Get existing student to check if email changed
    const { data: existingStudent, error: fetchError } = await supabaseAdmin
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

    // Check if email is already taken by another student
    if (data.email !== existingStudent.email) {
      const { data: emailCheck } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('email', data.email)
        .neq('id', existingStudent.id)
        .single()

      if (emailCheck) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 400 })
      }
    }

    // Update student record - only update fields that are provided
    const { data: updatedStudent, error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        name: data.name,
        email: data.email,
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
    // For students, use the session role (USER) instead of the linked user's role
    const userRole = session.user.role === "USER" || !session.user.isAdminUser 
      ? "USER" 
      : (updatedStudent.user?.role || session.user.role)
    
    const mappedUpdatedStudent = {
      id: updatedStudent.id,
      studentId: updatedStudent.student_id,
      name: updatedStudent.name,
      email: updatedStudent.email,
      yearLevel: `YEAR_${updatedStudent.year_level}`,
      course: updatedStudent.course,
      enrolledAt: updatedStudent.created_at,
      user: {
        id: updatedStudent.user?.id || session.user.id,
        email: updatedStudent.user?.email || session.user.email,
        name: updatedStudent.user?.name || session.user.name,
        role: userRole
      }
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