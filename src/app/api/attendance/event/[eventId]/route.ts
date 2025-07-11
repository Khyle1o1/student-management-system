import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { z } from "zod"

const attendanceSchema = z.object({
  student_id: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE'])
})

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // First check if event exists
    const { data: event, error: eventError } = await supabase
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

    // Get total count for pagination
    const { count } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    // Get attendance records with student details
    const { data: records, error } = await supabase
      .from('attendance')
      .select(`
        *,
        student:students(
          id,
          student_id,
          name,
          email,
          college,
          course,
          year_level
        )
      `)
      .eq('event_id', eventId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching attendance records:', error)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    return NextResponse.json({
      event,
      records,
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/attendance/event/[eventId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const data = attendanceSchema.parse(body)

    // Check if event exists
    const { data: event, error: eventError } = await supabase
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

    // Check if student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', data.student_id)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
    }

    // Check if attendance record already exists
    const { data: existingRecord } = await supabase
      .from('attendance')
      .select('id')
      .eq('event_id', eventId)
      .eq('student_id', student.id)
      .single()

    if (existingRecord) {
      return NextResponse.json({ error: 'Attendance record already exists' }, { status: 400 })
    }

    // Create attendance record
    const { data: record, error } = await supabase
      .from('attendance')
      .insert([{
        event_id: eventId,
        student_id: student.id,
        status: data.status
      }])
      .select(`
        *,
        student:students(
          id,
          student_id,
          name,
          email,
          college,
          course,
          year_level
        )
      `)
      .single()

    if (error) {
      console.error('Error creating attendance record:', error)
      return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 })
    }

    return NextResponse.json(record, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/attendance/event/[eventId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 