import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if student exists
    const { data: student, error: fetchError } = await supabaseAdmin
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

    // Toggle archive status
    const newArchivedStatus = !student.archived
    const archivedAt = newArchivedStatus ? new Date().toISOString() : null

    // Update student record
    const { data: updatedStudent, error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        archived: newArchivedStatus,
        archived_at: archivedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error archiving student:', updateError)
      return NextResponse.json({ error: 'Failed to archive student' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      student: updatedStudent,
      message: newArchivedStatus ? 'Student archived successfully' : 'Student unarchived successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/students/[id]/archive:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

