import { supabase } from "@/lib/supabase"
import { createAttendanceConfirmationNotification, createCertificateAvailableNotification } from "@/lib/notifications"

// Utility function to auto-generate certificates for present students
export async function generateCertificatesForEvent(eventId: string) {
  try {
    // Get all students who attended the event (present status and signed out)
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendance')
      .select(`
        student_id,
        student:students(
          id,
          student_id,
          name,
          email,
          user_id
        )
      `)
      .eq('event_id', eventId)
      .not('time_out', 'is', null) // Must have signed out
      .not('time_in', 'is', null) // Must have signed in
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
        const student = attendee.student
        
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
            student_id: attendee.student_id,
            success: true,
            message: 'Certificate already exists',
            certificate_id: existingCert.id
          })
          continue
        }
        
        // Generate unique certificate number
        const certificateNumber = `CERT-${event.title.substring(0, 3).toUpperCase()}-${attendee.student_id}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

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
          console.error(`Error creating certificate for student ${attendee.student_id}:`, certError)
          results.push({
            student_id: attendee.student_id,
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
          userId: (student as any)?.user_id,
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
            userId: (student as any)?.user_id,
            eventTitle: event.title,
            certificateUrl: `/dashboard/certificates/${certificate.id}`,
            certificateNumber: certificateNumber,
            certificateId: certificate.id,
            eventId: eventId
          })
        }

        results.push({
          student_id: attendee.student_id,
          success: true,
          certificate_id: certificate.id
        })

      } catch (error) {
        console.error(`Error processing certificate for student ${attendee.student_id || 'unknown'}:`, error)
        results.push({
          student_id: attendee.student_id || 'unknown',
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

