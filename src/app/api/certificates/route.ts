import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
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
    let query = supabase
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
    if (session.user.role === 'STUDENT') {
      const studentRecord = await supabase
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
              
              // Check if student has submitted evaluation
              const { data: response } = await supabase
                .from('student_evaluation_responses')
                .select('id, submitted_at')
                .eq('event_id', cert.event_id)
                .eq('student_id', studentRecord.data.id)
                .single()

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
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
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

    let templateId = null
    if (eventTemplateError || !eventTemplate) {
      // Create a default template for this event if none exists
      const defaultTemplate = {
        title: `Default Template for ${event.title}`,
        description: 'Auto-generated default certificate template',
        background_design: {
          background_color: '#ffffff',
          border_color: '#000000',
          border_width: 2,
          logo_position: 'top-center',
          pattern: 'none'
        },
        dynamic_fields: [
          {
            id: 'student_name',
            type: 'student_name',
            label: 'Student Name',
            position: { x: 1000, y: 500 },
            style: {
              font_family: 'Arial',
              font_size: 24,
              font_weight: 'bold',
              color: '#000000',
              text_align: 'center'
            }
          },
          {
            id: 'event_name',
            type: 'event_name',
            label: 'Event Name',
            position: { x: 1000, y: 400 },
            style: {
              font_family: 'Arial',
              font_size: 20,
              font_weight: 'normal',
              color: '#000000',
              text_align: 'center'
            }
          },
          {
            id: 'certificate_number',
            type: 'certificate_number',
            label: 'Certificate Number',
            position: { x: 1000, y: 1200 },
            style: {
              font_family: 'Arial',
              font_size: 12,
              font_weight: 'normal',
              color: '#000000',
              text_align: 'center'
            }
          }
        ],
        template_html: `<div class="certificate-container">
          <div class="certificate-content">
            <h1>Certificate of Participation</h1>
            <div class="fields-container">
              {{fields}}
            </div>
          </div>
        </div>`,
        template_css: `
          .certificate-container {
            width: 2000px;
            height: 1414px;
            background: white;
            border: 2px solid #000000;
            position: relative;
            font-family: Arial, sans-serif;
          }
          .certificate-content {
            padding: 50px;
            text-align: center;
          }
          .fields-container {
            position: relative;
            width: 100%;
            height: 100%;
          }
        `,
        is_active: true
      }

      // Create the default template
      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('certificate_templates')
        .insert([{
          ...defaultTemplate,
          created_by: session.user.id
        }])
        .select()
        .single()

      if (createTemplateError) {
        console.error('Error creating default template:', createTemplateError)
        return NextResponse.json({ error: 'Failed to create default certificate template' }, { status: 500 })
      }

      // Link the template to the event
      const { error: linkError } = await supabase
        .from('event_certificate_templates')
        .insert([{
          event_id: data.event_id,
          certificate_template_id: newTemplate.id
        }])

      if (linkError) {
        console.error('Error linking template to event:', linkError)
        // Continue anyway, we have the template
      }

      templateId = newTemplate.id
    } else {
      templateId = eventTemplate.certificate_template_id
    }

    // Determine if certificate should be accessible immediately
    let isAccessible = true
    if (event.require_evaluation) {
      // Check if student completed evaluation
      const { data: evalResponse, error: evalError } = await supabase
        .from('student_evaluation_responses')
        .select('id')
        .eq('event_id', data.event_id)
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
      evaluationUrl: event.require_evaluation ? `/dashboard/evaluations/${data.event_id}` : undefined,
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

// Utility function to auto-generate certificates for present students
export async function generateCertificatesForEvent(eventId: string) {
  try {
    // Get all students who attended the event (present status and signed out)
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendance')
      .select(`
        student_id,
        students!inner(
          id,
          student_id,
          name,
          email,
          user_id
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'PRESENT')
      .not('time_out', 'is', null) // Must have signed out
      .eq('certificate_generated', false)

    if (attendeesError) {
      console.error('Error fetching attendees:', attendeesError)
      return { success: false, error: 'Failed to fetch attendees' }
    }

    if (!attendees || attendees.length === 0) {
      return { success: true, message: 'No new certificates to generate' }
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      return { success: false, error: 'Failed to fetch event details' }
    }

    // Get certificate template ID from event_certificate_templates
    const { data: eventTemplate, error: eventTemplateError } = await supabase
      .from('event_certificate_templates')
      .select('certificate_template_id')
      .eq('event_id', eventId)
      .single()

    let templateId = null
    if (eventTemplateError || !eventTemplate) {
      console.log('No template found for event, creating default template...')
      // Create a default template for this event if none exists
      const defaultTemplate = {
        title: `Default Template for ${event.title}`,
        description: 'Auto-generated default certificate template',
        background_design: {
          background_color: '#ffffff',
          border_color: '#000000',
          border_width: 2,
          logo_position: 'top-center',
          pattern: 'none'
        },
        dynamic_fields: [
          {
            id: 'student_name',
            type: 'student_name',
            label: 'Student Name',
            position: { x: 1000, y: 500 },
            style: {
              font_family: 'Arial',
              font_size: 24,
              font_weight: 'bold',
              color: '#000000',
              text_align: 'center'
            }
          },
          {
            id: 'event_name',
            type: 'event_name',
            label: 'Event Name',
            position: { x: 1000, y: 400 },
            style: {
              font_family: 'Arial',
              font_size: 20,
              font_weight: 'normal',
              color: '#000000',
              text_align: 'center'
            }
          },
          {
            id: 'certificate_number',
            type: 'certificate_number',
            label: 'Certificate Number',
            position: { x: 1000, y: 1200 },
            style: {
              font_family: 'Arial',
              font_size: 12,
              font_weight: 'normal',
              color: '#000000',
              text_align: 'center'
            }
          }
        ],
        template_html: `<div class="certificate-container">
          <div class="certificate-content">
            <h1>Certificate of Participation</h1>
            <div class="fields-container">
              {{fields}}
            </div>
          </div>
        </div>`,
        template_css: `
          .certificate-container {
            width: 2000px;
            height: 1414px;
            background: white;
            border: 2px solid #000000;
            position: relative;
            font-family: Arial, sans-serif;
          }
          .certificate-content {
            padding: 50px;
            text-align: center;
          }
          .fields-container {
            position: relative;
            width: 100%;
            height: 100%;
          }
        `,
        is_active: true
      }

      // Create the default template
      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('certificate_templates')
        .insert([{
          ...defaultTemplate,
          created_by: '00000000-0000-0000-0000-000000000000' // System user ID
        }])
        .select()
        .single()

      if (createTemplateError) {
        console.error('Error creating default template:', createTemplateError)
        return { success: false, error: 'Failed to create default certificate template' }
      }

      // Link the template to the event
      const { error: linkError } = await supabase
        .from('event_certificate_templates')
        .insert([{
          event_id: eventId,
          certificate_template_id: newTemplate.id
        }])

      if (linkError) {
        console.error('Error linking template to event:', linkError)
        // Continue anyway, we have the template
      }

      templateId = newTemplate.id
    } else {
      templateId = eventTemplate.certificate_template_id
    }

    const results = []
    
    for (const attendee of attendees) {
      try {
        // Access student data properly - it's a single object, not an array
        const student = Array.isArray(attendee.students) ? attendee.students[0] : attendee.students
        
        // Check if certificate already exists for this student
        const { data: existingCert, error: existingError } = await supabase
          .from('certificates')
          .select('id')
          .eq('event_id', eventId)
          .eq('student_id', attendee.student_id)
          .single()

        if (existingCert) {
          // Certificate already exists, skip
          results.push({
            student_id: student.student_id,
            success: true,
            message: 'Certificate already exists',
            certificate_id: existingCert.id
          })
          continue
        }
        
        // Generate unique certificate number
        const certificateNumber = `CERT-${event.title.substring(0, 3).toUpperCase()}-${student.student_id}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

        // Determine accessibility based on evaluation requirement
        let isAccessible = true
        if (event.require_evaluation) {
          const { data: evalResponse } = await supabase
            .from('student_evaluation_responses')
            .select('id')
            .eq('event_id', eventId)
            .eq('student_id', attendee.student_id)
            .single()

          isAccessible = !!evalResponse
        }

        // Create certificate
        const { data: certificate, error: certError } = await supabase
          .from('certificates')
          .insert([{
            event_id: eventId,
            student_id: attendee.student_id,
            certificate_type: 'PARTICIPATION',
            certificate_number: certificateNumber,
            certificate_template_id: templateId,
            is_accessible: isAccessible,
          }])
          .select()
          .single()

        if (certError) {
          console.error(`Error creating certificate for student ${student.student_id}:`, certError)
          results.push({
            student_id: student.student_id,
            success: false,
            error: certError.message
          })
          continue
        }

        // Update attendance record
        await supabase
          .from('attendance')
          .update({ certificate_generated: true })
          .eq('event_id', eventId)
          .eq('student_id', attendee.student_id)

        // Create attendance confirmation notification
        await createAttendanceConfirmationNotification({
          studentId: attendee.student_id,
          userId: student.user_id,
          eventTitle: event.title,
          eventDate: new Date(event.date).toLocaleDateString(),
          eventLocation: event.location || 'TBD',
          requiresEvaluation: event.require_evaluation || false,
          evaluationUrl: event.require_evaluation ? `/dashboard/evaluations/${eventId}` : undefined,
          certificateUrl: isAccessible ? `/dashboard/certificates/${certificate.id}` : undefined,
          eventId: eventId
        })

        // If certificate is immediately accessible, also send certificate ready notification
        if (isAccessible) {
          await createCertificateAvailableNotification({
            studentId: attendee.student_id,
            userId: student.user_id,
            eventTitle: event.title,
            certificateUrl: `/dashboard/certificates/${certificate.id}`,
            certificateNumber: certificateNumber,
            certificateId: certificate.id,
            eventId: eventId
          })
        }

        results.push({
          student_id: student.student_id,
          success: true,
          certificate_id: certificate.id
        })

      } catch (error) {
        const student = Array.isArray(attendee.students) ? attendee.students[0] : attendee.students
        console.error(`Error processing certificate for student ${student?.student_id || 'unknown'}:`, error)
        results.push({
          student_id: student?.student_id || 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return {
      success: true,
      message: `Certificate generation completed. ${successCount} successful, ${failureCount} failed.`,
      results: results
    }

  } catch (error) {
    console.error('Error in generateCertificatesForEvent:', error)
    return { success: false, error: 'Internal server error' }
  }
} 