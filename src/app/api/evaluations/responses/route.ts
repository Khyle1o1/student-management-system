import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { createCertificateAvailableNotification } from "@/lib/notifications"

const submitResponseSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  evaluation_id: z.string().min(1, "Evaluation ID is required"),
  responses: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one response is required" }
  ),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const studentId = searchParams.get('student_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const offset = (page - 1) * limit

    // Build query based on user role and parameters
    let query = supabase
      .from('student_evaluation_responses')
      .select(`
        *,
        event:events(
          id,
          title,
          date
        ),
        student:students(
          id,
          student_id,
          name,
          email
        ),
        evaluation:evaluations(
          id,
          title,
          questions
        )
      `, { count: 'exact' })

    // If student user, only show their own responses
    if (session.user.role === 'STUDENT') {
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', session.user.studentId)
        .single()

      if (studentError || !studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }

      query = query.eq('student_id', studentRecord.id)
    }

    // Filter by event if specified
    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    // Filter by student if specified (admin only)
    if (studentId && session.user.role === 'ADMIN') {
      query = query.eq('student_id', studentId)
    }

    const { data: responses, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching evaluation responses:', error)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    return NextResponse.json({
      responses: responses || [],
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/evaluations/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Students can submit responses, admins can also submit (for testing)
    if (session.user.role !== 'STUDENT' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data = submitResponseSchema.parse(body)

    // Get student record
    let studentId: string
    let studentData: any
    if (session.user.role === 'STUDENT') {
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', session.user.studentId)
        .single()

      if (studentError || !studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }
      studentId = studentRecord.id
      studentData = studentRecord
    } else {
      // For admin testing, allow passing student_id in body
      if (!body.student_id) {
        return NextResponse.json({ error: 'Student ID required for admin submissions' }, { status: 400 })
      }
      studentId = body.student_id

      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentError || !studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }
      studentData = studentRecord
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, require_evaluation')
      .eq('id', data.event_id)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to verify event' }, { status: 500 })
    }

    // Verify evaluation exists
    const { data: evaluation, error: evaluationError } = await supabase
      .from('evaluations')
      .select('id, questions')
      .eq('id', data.evaluation_id)
      .single()

    if (evaluationError) {
      if (evaluationError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
      }
      console.error('Error fetching evaluation:', evaluationError)
      return NextResponse.json({ error: 'Failed to verify evaluation' }, { status: 500 })
    }

    // Verify student attended the event (has attendance record)
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, status')
      .eq('event_id', data.event_id)
      .eq('student_id', studentId)
      .single()

    if (attendanceError || !attendance) {
      return NextResponse.json({ 
        error: 'You must attend the event to submit an evaluation' 
      }, { status: 403 })
    }

    // Check if response already exists
    const { data: existingResponse, error: existingError } = await supabase
      .from('student_evaluation_responses')
      .select('id')
      .eq('event_id', data.event_id)
      .eq('student_id', studentId)
      .single()

    if (existingResponse) {
      return NextResponse.json({ 
        error: 'You have already submitted an evaluation for this event' 
      }, { status: 400 })
    }

    // Validate responses against evaluation questions
    const questions = evaluation.questions as any[]
    const requiredQuestions = questions.filter(q => q.required)
    
    for (const question of requiredQuestions) {
      if (!(question.id in data.responses)) {
        return NextResponse.json({ 
          error: `Response required for question: ${question.question}` 
        }, { status: 400 })
      }
    }

    // Submit the response
    const { data: response, error } = await supabase
      .from('student_evaluation_responses')
      .insert([{
        event_id: data.event_id,
        student_id: studentId,
        evaluation_id: data.evaluation_id,
        responses: data.responses,
      }])
      .select(`
        *,
        event:events(
          id,
          title,
          date
        ),
        student:students(
          id,
          student_id,
          name,
          email
        ),
        evaluation:evaluations(
          id,
          title
        )
      `)
      .single()

    if (error) {
      console.error('Error submitting evaluation response:', error)
      return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
    }

    // Update attendance record to mark evaluation as completed
    const { error: updateError } = await supabase
      .from('attendance')
      .update({ evaluation_completed: true })
      .eq('event_id', data.event_id)
      .eq('student_id', studentId)

    if (updateError) {
      console.error('Error updating attendance record:', updateError)
      // Don't fail the response submission for this
    }

    // If event requires evaluation, this submission may unlock the certificate
    if (event.require_evaluation) {
      // Check if certificate exists and update accessibility
      const { data: certificate, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .eq('event_id', data.event_id)
        .eq('student_id', studentId)
        .single()

      if (certificate) {
        const { error: updateCertError } = await supabase
          .from('certificates')
          .update({ is_accessible: true })
          .eq('id', certificate.id)

        if (updateCertError) {
          console.error('Error updating certificate accessibility:', updateCertError)
        } else {
          // Create notification that certificate is ready
          await createCertificateAvailableNotification({
            studentId: studentId,
            userId: studentData.user_id,
            eventTitle: event.title,
            certificateUrl: `/dashboard/certificates/${certificate.id}`,
            certificateNumber: certificate.certificate_number,
            certificateId: certificate.id,
            eventId: data.event_id
          })
        }
      }
    }

    return NextResponse.json({
      ...response,
      message: 'Evaluation submitted successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/evaluations/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 