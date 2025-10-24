import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"

const recordAttendanceSchema = z.object({
  barcode: z.string().min(1, "Barcode/Student ID is required")
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const { barcode } = recordAttendanceSchema.parse(body)

    // Check if event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    // Find student by student_id (barcode)
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('student_id', barcode)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ error: 'Failed to find student' }, { status: 500 })
    }

    // Check if student already has attendance for this event
    const { data: existingRecord } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('event_id', eventId)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const currentTime = new Date().toISOString()
    let action = 'in'
    let attendanceRecord

    if (!existingRecord || existingRecord.length === 0 || existingRecord[0].time_out) {
      // First sign-in or re-entry after sign-out
      const { data: newRecord, error: insertError } = await supabaseAdmin
        .from('attendance')
        .insert([{
          event_id: eventId,
          student_id: student.id,
          status: 'PRESENT',
          mode: 'SIGN_IN',
          time_in: currentTime,
          time_out: null
        }])
        .select('*')
        .single()

      if (insertError) {
        console.error('Error creating attendance record:', insertError)
        return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
      }

      attendanceRecord = newRecord
      action = 'in'
    } else {
      // Sign-out
      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from('attendance')
        .update({
          time_out: currentTime,
          updated_at: currentTime
        })
        .eq('id', existingRecord[0].id)
        .select('*')
        .single()

      if (updateError) {
        console.error('Error updating attendance record:', updateError)
        return NextResponse.json({ error: 'Failed to record sign-out' }, { status: 500 })
      }

      attendanceRecord = updatedRecord
      action = 'out'
    }

    return NextResponse.json({
      success: true,
      studentName: student.name,
      studentId: student.student_id,
      action: action,
      timestamp: currentTime,
      record: attendanceRecord
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Error in POST /api/attendance/event/[eventId]/record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 