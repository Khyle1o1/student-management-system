import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { createAttendanceConfirmationNotification, createCertificateAvailableNotification } from "@/lib/notifications"

const generateCertificateSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
  student_id: z.string().min(1, "Student ID is required"),
  certificate_type: z.string().default("PARTICIPATION"),
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
    const accessible = searchParams.get('accessible') // "true" to filter accessible certificates
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const offset = (page - 1) * limit

    // Build query based on user role and parameters
    let query = supabaseAdmin
      .from('certificates')
      .select(`
        *,
        event:events(
          id,
          title,
          date,
          location,
          require_evaluation
        ),
        student:students(
          id,
          student_id,
          name,
          email
        )
      `, { count: 'exact' })

    // If student user, only show their own certificates
    if (session.user.role === 'USER') {
      const { data: studentRecord, error: studentError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('student_id', session.user.studentId)
        .single()

      if (studentError || !studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }

      query = query.eq('student_id', studentRecord.id)
    }

    // Filter by event if provided
    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    // Filter by student if provided and user is admin
    if (studentId && session.user.role === 'ADMIN') {
      query = query.eq('student_id', studentId)
    }

    // Filter by accessibility if provided
    if (accessible === 'true') {
      query = query.eq('is_accessible', true)
    }

    // Apply pagination
    const { data: certificates, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('generated_at', { ascending: false })

    if (error) {
      console.error('Error fetching certificates:', error)
      return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 })
    }

    // For student requests, also get evaluation status for each certificate
    if (session.user.role === 'USER') {
      const studentRecord = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('student_id', session.user.studentId)
        .single()

      if (studentRecord.data) {
        const enhancedCertificates = await Promise.all(
          certificates.map(async (cert) => {
            let evaluationStatus = null
            let hasEvaluation = false
            
            // Check if event requires evaluation
            if (cert.event.require_evaluation) {
              hasEvaluation = true
              
              // Get the event with evaluation_id
              const { data: eventData } = await supabaseAdmin
                .from('events')
                .select('evaluation_id')
                .eq('id', cert.event_id)
                .single()
              
              let response = null
              if (eventData?.evaluation_id) {
                // Check if student has submitted evaluation in the new forms system
                const { data: formResponse } = await supabaseAdmin
                  .from('form_responses')
                  .select('id, submitted_at')
                  .eq('form_id', eventData.evaluation_id)
                  .eq('student_id', studentRecord.data.id)
                  .single()
                
                response = formResponse
                
                // If evaluation is completed but certificate is not accessible, update it
                if (response && !cert.is_accessible) {
                  console.log(`🔔 [CERTIFICATES] Updating certificate ${cert.id} accessibility - evaluation completed`)
                  await supabaseAdmin
                    .from('certificates')
                    .update({ is_accessible: true })
                    .eq('id', cert.id)
                  
                  // Update the cert object for this response
                  cert.is_accessible = true
                }
              }

              evaluationStatus = {
                required: true,
                completed: !!response,
                submittedAt: response?.submitted_at || null
              }
            } else {
              evaluationStatus = {
                required: false,
                completed: false,
                submittedAt: null
              }
            }

            return {
              ...cert,
              evaluationStatus,
              hasEvaluation
            }
          })
        )

        return NextResponse.json({
          certificates: enhancedCertificates,
          total: count || 0,
          page,
          limit
        })
      }
    }

    return NextResponse.json({
      certificates: certificates || [],
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/certificates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data = generateCertificateSchema.parse(body)

    // Verify event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*, evaluation_id, require_evaluation')
      .eq('id', data.event_id)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to verify event' }, { status: 500 })
    }

    // Verify student exists and attended the event
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', data.student_id)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ error: 'Failed to verify student' }, { status: 500 })
    }

    // Check if student attended the event
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('event_id', data.event_id)
      .eq('student_id', data.student_id)
      .single()

    if (attendanceError || !attendance) {
      return NextResponse.json({ 
        error: 'Student must attend the event to receive a certificate' 
      }, { status: 403 })
    }

    // Check if certificate already exists
    const { data: existingCert, error: existingError } = await supabase
      .from('certificates')
      .select('id')
      .eq('event_id', data.event_id)
      .eq('student_id', data.student_id)
      .single()

    if (existingCert) {
      return NextResponse.json({ 
        error: 'Certificate already exists for this student and event' 
      }, { status: 400 })
    }

    // Generate unique certificate number
    const certificateNumber = `CERT-${event.title.substring(0, 3).toUpperCase()}-${student.student_id}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    // Get certificate template ID from event_certificate_templates
    const { data: eventTemplate, error: eventTemplateError } = await supabase
      .from('event_certificate_templates')
      .select('certificate_template_id')
      .eq('event_id', data.event_id)
      .single()

    if (eventTemplateError || !eventTemplate) {
      console.error('No certificate template linked to this event.')
      return NextResponse.json({ 
        error: 'No certificate template found for this event. Please link a certificate template in the event settings.' 
      }, { status: 400 })
    }

    const templateId = eventTemplate.certificate_template_id

    // Determine if certificate should be accessible immediately
    let isAccessible = true
    if (event.require_evaluation && event.evaluation_id) {
      // Check if student completed evaluation in the new forms system
      const { data: evalResponse } = await supabaseAdmin
        .from('form_responses')
        .select('id')
        .eq('form_id', event.evaluation_id)
        .eq('student_id', data.student_id)
        .single()

      isAccessible = !!evalResponse
    }

    // Create certificate record
    const { data: certificate, error } = await supabase
      .from('certificates')
      .insert([{
        event_id: data.event_id,
        student_id: data.student_id,
        certificate_type: data.certificate_type,
        certificate_number: certificateNumber,
        certificate_template_id: templateId,
        is_accessible: isAccessible,
        file_path: null, // Will be set when PDF is generated
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
        )
      `)
      .single()

    if (error) {
      console.error('Error creating certificate:', error)
      return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 })
    }

    // Update attendance record to mark certificate as generated
    const { error: updateError } = await supabase
      .from('attendance')
      .update({ certificate_generated: true })
      .eq('event_id', data.event_id)
      .eq('student_id', data.student_id)

    if (updateError) {
      console.error('Error updating attendance record:', updateError)
      // Don't fail certificate creation for this
    }

    // Create notification for attendance confirmation
    await createAttendanceConfirmationNotification({
      studentId: data.student_id,
      userId: student.user_id,
      eventTitle: event.title,
      eventDate: new Date(event.date).toLocaleDateString(),
      eventLocation: event.location || 'TBD',
      requiresEvaluation: event.require_evaluation || false,
      evaluationUrl: event.require_evaluation ? `/dashboard/events/${data.event_id}/evaluation` : undefined,
      certificateUrl: isAccessible ? `/dashboard/certificates/${certificate.id}` : undefined,
      eventId: data.event_id
    })

    // If certificate is immediately accessible, also send certificate ready notification
    if (isAccessible) {
      await createCertificateAvailableNotification({
        studentId: data.student_id,
        userId: student.user_id,
        eventTitle: event.title,
        certificateUrl: `/dashboard/certificates/${certificate.id}`,
        certificateNumber: certificateNumber,
        certificateId: certificate.id,
        eventId: data.event_id
      })
    }

    return NextResponse.json({
      ...certificate,
      message: 'Certificate generated successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/certificates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
