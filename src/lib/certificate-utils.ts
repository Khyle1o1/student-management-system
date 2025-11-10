import { supabaseAdmin } from "@/lib/supabase-admin"
import { createAttendanceConfirmationNotification, createCertificateAvailableNotification } from "@/lib/notifications"

// Utility function to auto-generate certificates for present students
export async function generateCertificatesForEvent(eventId: string) {
  try {
    // Get event details first to check attendance type
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*, evaluation_id, require_evaluation, attendance_type')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      return { success: false, error: 'Failed to fetch event details' }
    }

    // Build query based on attendance type
    let attendeesQuery = supabaseAdmin
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
      .not('time_in', 'is', null) // Must have signed in
      .eq('certificate_generated', false)

    // For IN_OUT events, also check that they have signed out
    if (event.attendance_type === 'IN_OUT') {
      attendeesQuery = attendeesQuery.not('time_out', 'is', null)
    }

    const { data: attendees, error: attendeesError } = await attendeesQuery

    if (attendeesError) {
      console.error('Error fetching attendees:', attendeesError)
      return { success: false, error: 'Failed to fetch attendees' }
    }

    if (!attendees || attendees.length === 0) {
      console.log(`No new certificates to generate for event ${eventId}`)
      return { success: true, message: 'No new certificates to generate' }
    }

    console.log(`Generating certificates for ${attendees.length} students in event ${eventId}`)

    // Get certificate template ID from event_certificate_templates
    const { data: eventTemplate, error: eventTemplateError } = await supabaseAdmin
      .from('event_certificate_templates')
      .select('certificate_template_id')
      .eq('event_id', eventId)
      .single()

    if (eventTemplateError || !eventTemplate) {
      console.error('❌ No certificate template linked to this event. Please link a template in event settings.')
      return { 
        success: false, 
        error: 'No certificate template found for this event. Please link a certificate template in the event settings.' 
      }
    }

    const templateId = eventTemplate.certificate_template_id
    console.log(`✅ Using certificate template: ${templateId}`)

    const results = []
    
    for (const attendee of attendees) {
      try {
        // Access student data properly - it's a single object, not an array
        const student = attendee.student
        
        // Check if certificate already exists for this student
        const { data: existingCert, error: existingError } = await supabaseAdmin
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
        if (event.require_evaluation && event.evaluation_id) {
          console.log(`Event requires evaluation. Checking if student ${attendee.student_id} completed form ${event.evaluation_id}`)
          // Check if student completed evaluation in the new forms system
          const { data: evalResponse } = await supabaseAdmin
            .from('form_responses')
            .select('id')
            .eq('form_id', event.evaluation_id)
            .eq('student_id', attendee.student_id)
            .single()

          isAccessible = !!evalResponse
          console.log(`Student ${attendee.student_id} evaluation status: ${evalResponse ? 'COMPLETED' : 'NOT COMPLETED'}, is_accessible: ${isAccessible}`)
        } else {
          console.log(`Event does not require evaluation. Certificate will be immediately accessible.`)
        }

        // Create certificate
        const { data: certificate, error: certError } = await supabaseAdmin
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
          console.error(`❌ Error creating certificate for student ${attendee.student_id}:`, certError)
          results.push({
            student_id: attendee.student_id,
            success: false,
            error: certError.message
          })
          continue
        }

        console.log(`✅ Certificate created successfully for student ${attendee.student_id}:`, certificate.id, `is_accessible: ${certificate.is_accessible}`)

        // Update attendance record
        await supabaseAdmin
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
          evaluationUrl: event.require_evaluation ? `/dashboard/events/${eventId}/evaluation` : undefined,
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

