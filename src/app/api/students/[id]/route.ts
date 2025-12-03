import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"

const updateStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  student_id: z.string().min(1).optional(),
  college: z.string().min(1),
  year_level: z.number().min(1),
  course: z.string().min(1)
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Use admin client to bypass RLS
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
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', error)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Get attendance summary
    const { data: attendanceData } = await supabaseAdmin
      .from('attendance')
      .select(`
        id,
        status,
        created_at,
        event:events(
          id,
          title,
          date,
          location
        )
      `)
      .eq('student_id', id)

    const attendanceSummary = {
      attended: attendanceData?.filter(a => a.status === 'PRESENT').length || 0,
      missed: attendanceData?.filter(a => a.status === 'ABSENT').length || 0,
      total: attendanceData?.length || 0,
      records: attendanceData || []
    }

    // Get payment records (fees are now automatically assigned)
    const { data: paymentsData } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        amount,
        status,
        payment_date,
        reference,
        created_at,
        fee:fee_structures(
          id,
          name,
          amount,
          due_date,
          description
        )
      `)
      .eq('student_id', id)

    const paymentSummary = {
      paid: paymentsData?.filter(p => p.status === 'PAID').length || 0,
      unpaid: paymentsData?.filter(p => p.status === 'UNPAID').length || 0,
      total: paymentsData?.length || 0,
      records: paymentsData || []
    }

    return NextResponse.json({
      ...student,
      attendance: attendanceSummary,
      payments: paymentSummary
    })

  } catch (error) {
    console.error('Error in GET /api/students/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateStudentSchema.parse(body)

    // Check if student exists
    const { data: existingStudent, error: fetchError } = await supabaseAdmin
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
      const { data: emailCheck } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('email', data.email)
        .neq('id', id)
        .single()

      if (emailCheck) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 400 })
      }
    }

    // Check if student_id is already taken by another student (if provided and changed)
    if (data.student_id && data.student_id !== existingStudent.student_id) {
      const { data: studentIdCheck } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('student_id', data.student_id)
        .neq('id', id)
        .single()

      if (studentIdCheck) {
        return NextResponse.json({ error: 'Student ID already taken' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      college: data.college,
      year_level: data.year_level,
      course: data.course,
      updated_at: new Date().toISOString()
    }

    // Only update student_id if provided
    if (data.student_id) {
      updateData.student_id = data.student_id
    }

    // Update student record
    const { data: updatedStudent, error: updateError } = await supabaseAdmin
      .from('students')
      .update(updateData)
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

    // Update associated user record only if it exists and is an admin user
    // Students may have user_id pointing to a user with role 'USER', which is no longer valid
    // Only update if the user exists and has a valid admin role
    if (existingStudent.user_id) {
      const { data: existingUser, error: userFetchError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', existingStudent.user_id)
        .single()

      // Only update if user exists and has a valid admin role (not 'USER')
      if (!userFetchError && existingUser && ['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(existingUser.role)) {
        const { error: userUpdateError } = await supabaseAdmin
          .from('users')
          .update({
            email: data.email,
            name: data.name
          })
          .eq('id', existingStudent.user_id)

        if (userUpdateError) {
          console.error('Error updating user:', userUpdateError)
          // Don't rollback student update - user update failure is not critical
          // The student record is already updated successfully
          console.warn('Student updated but user update failed. This is non-critical.')
        }
      } else {
        // User doesn't exist or has invalid role - skip user update
        // This is fine for students who don't have admin user accounts
        console.log('Skipping user update - user not found or has invalid role')
      }
    }

    // Log system activity: student updated
    try {
      const now = new Date().toISOString()
      const activityMessage = `Admin ${session.user.name || 'Unknown'} (${session.user.role}) updated student ${updatedStudent.name} (${updatedStudent.student_id || 'No ID'})`

      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: session.user.id,
          student_id: updatedStudent.id,
          type: 'SYSTEM_ACTIVITY',
          title: 'Student Updated',
          message: activityMessage,
          data: {
            action: 'STUDENT_UPDATED',
            admin: { id: session.user.id, name: session.user.name, role: session.user.role },
            student: { id: updatedStudent.id, name: updatedStudent.name, student_id: updatedStudent.student_id, email: updatedStudent.email },
            occurred_at: now
          },
          is_read: false,
          created_at: now
        })

      await logActivity({
        session,
        action: "STUDENT_UPDATED",
        module: "students",
        targetType: "student",
        targetId: updatedStudent.id,
        targetName: updatedStudent.name,
        college: updatedStudent.college || null,
        course: updatedStudent.course || null,
        details: {
          student_id: updatedStudent.student_id,
          email: updatedStudent.email,
        },
      })
    } catch (logError) {
      console.error('Failed to log system activity for student update:', logError)
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

// DELETE method removed - use archive endpoint instead
// Students should be archived, not deleted
// Archived students are automatically deleted after 2 years 