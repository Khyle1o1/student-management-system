import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { generateCertificatesForEvent } from "../../certificates/route"

const barcodeScanSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  eventId: z.string().min(1, "Event ID is required"),
  mode: z.enum(['SIGN_IN', 'SIGN_OUT'], {
    required_error: "Mode must be either SIGN_IN or SIGN_OUT"
  })
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, eventId, mode } = barcodeScanSchema.parse(body)

    // 1. Check if event exists and get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false,
          error: 'Event not found' 
        }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch event' 
      }, { status: 500 })
    }

    // 2. Check if event is currently active (within time window)
    const timeValidation = checkEventTimeWindow(event)
    if (!timeValidation.isActive) {
      return NextResponse.json({ 
        success: false,
        error: timeValidation.message 
      }, { status: 400 })
    }

    // 3. Check if student exists by student_id (barcode)
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false,
          error: 'Student not found or not eligible. Nothing was saved.' 
        }, { status: 404 })
      }
      console.error('Error fetching student:', studentError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to verify student' 
      }, { status: 500 })
    }

    // 4. Check student eligibility based on event scope
    const isEligible = await checkStudentEligibility(student, event)
    if (!isEligible) {
      return NextResponse.json({ 
        success: false,
        error: 'Student not eligible for this event. Nothing was saved.' 
      }, { status: 403 })
    }

    // 5. Get current attendance status for this student-event combination
    const { data: existingAttendance, error: attendanceCheckError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('event_id', eventId)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (attendanceCheckError && attendanceCheckError.code !== 'PGRST116') {
      console.error('Error checking existing attendance:', attendanceCheckError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to check attendance status' 
      }, { status: 500 })
    }

    const latestRecord = existingAttendance?.[0]

    // 6. Validate sign-in/sign-out logic
    if (mode === 'SIGN_IN') {
      // Check if student is already signed in (has a sign-in without sign-out)
      if (latestRecord && latestRecord.mode === 'SIGN_IN' && !latestRecord.time_out) {
        return NextResponse.json({ 
          success: false,
          error: 'Student already signed in. Nothing was saved.' 
        }, { status: 400 })
      }
    } else if (mode === 'SIGN_OUT') {
      // Check if student can sign out (must have a sign-in first)
      if (!latestRecord || latestRecord.mode !== 'SIGN_IN' || latestRecord.time_out) {
        return NextResponse.json({ 
          success: false,
          error: 'Student must sign in first or is already signed out. Nothing was saved.' 
        }, { status: 400 })
      }
    }

    // 7. Record the attendance
    const currentTime = new Date().toISOString()
    let attendanceRecord

    if (mode === 'SIGN_IN') {
      // Create new sign-in record
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
        .select(`
          *,
          student:students(
            id,
            student_id,
            name,
            email,
            college,
            course
          )
        `)
        .single()

      if (insertError) {
        console.error('Error creating sign-in record:', insertError)
        return NextResponse.json({ 
          success: false,
          error: 'Failed to record sign-in' 
        }, { status: 500 })
      }

      attendanceRecord = newRecord
    } else {
      // Update existing record with sign-out time
      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from('attendance')
        .update({
          time_out: currentTime,
          updated_at: currentTime
        })
        .eq('id', latestRecord.id)
        .select(`
          *,
          student:students(
            id,
            student_id,
            name,
            email,
            college,
            course
          )
        `)
        .single()

      if (updateError) {
        console.error('Error updating sign-out record:', updateError)
        return NextResponse.json({ 
          success: false,
          error: 'Failed to record sign-out' 
        }, { status: 500 })
      }

      attendanceRecord = updatedRecord
      
      // Auto-generate certificates when student signs out (completes attendance)
      try {
        await generateCertificatesForEvent(eventId)
      } catch (certificateError) {
        console.error('Error auto-generating certificates:', certificateError)
        // Don't fail the attendance recording if certificate generation fails
      }
    }

    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: `Attendance recorded successfully.`,
      data: {
        studentName: student.name,
        studentId: student.student_id,
        eventTitle: event.title,
        mode: mode,
        timestamp: currentTime,
        record: attendanceRecord
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: error.errors[0].message 
      }, { status: 400 })
    }

    console.error('Error in barcode scan endpoint:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to safely parse date (system already in Philippine timezone)
function parseEventDate(dateString: string): Date {
  try {
    // Handle different date formats
    let parsedDate: Date
    
    if (dateString.includes('T')) {
      // Already has time component
      parsedDate = new Date(dateString)
    } else {
      // Just date, system is already in Philippine timezone
      parsedDate = new Date(dateString + 'T00:00:00')
    }
    
    // Check if date is valid
    if (isNaN(parsedDate.getTime())) {
      // Fallback: try parsing as just date
      parsedDate = new Date(dateString)
    }
    
    return parsedDate
  } catch (error) {
    console.error('Error parsing date:', error, 'Date string:', dateString)
    return new Date() // Return current date as fallback
  }
}

// Helper function to check if event is currently active based on time window
function checkEventTimeWindow(event: any): { isActive: boolean; message: string } {
  try {
    // Get current time and detect timezone
    const now = new Date()
    
    // Check if server is already in Philippine timezone (GMT+8)
    const timezoneOffset = now.getTimezoneOffset()
    const isAlreadyPhilippineTime = timezoneOffset === -480 // -480 minutes = GMT+8
    
    // Get Philippine time
    const phTime = isAlreadyPhilippineTime ? now : new Date(now.getTime() + (8 * 60 * 60 * 1000))
    
    // Parse event date and times
    const eventDate = parseEventDate(event.date)
    
    // Check if date parsing failed
    if (isNaN(eventDate.getTime())) {
      return {
        isActive: false,
        message: 'Invalid event date format. Please contact administrator.'
      }
    }
    
    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)
    
    // Create event date in Philippine timezone
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    
    // Create event times in Philippine timezone
    const eventStartTime = new Date(eventDateOnly)
    eventStartTime.setHours(startHour, startMinute, 0, 0)
    
    const eventEndTime = new Date(eventDateOnly)
    eventEndTime.setHours(endHour, endMinute, 59, 999)
    
    // Use Philippine time for comparison
    const currentDate = new Date(phTime.getFullYear(), phTime.getMonth(), phTime.getDate())
    const eventOnlyDate = new Date(eventDateOnly)
    
    // Check if it's the right date
    if (currentDate.getTime() !== eventOnlyDate.getTime()) {
      if (currentDate < eventOnlyDate) {
        return {
          isActive: false,
          message: `Attendance not yet available. Event is scheduled for ${eventDate.toLocaleDateString()}.`
        }
      } else {
        return {
          isActive: false,
          message: `Attendance is no longer available. Event was on ${eventDate.toLocaleDateString()}.`
        }
      }
    }
    
    // Check if current time is within the event window (using Philippine time)
    if (phTime < eventStartTime) {
      const timeUntilStart = Math.ceil((eventStartTime.getTime() - phTime.getTime()) / (1000 * 60)) // minutes
      return {
        isActive: false,
        message: `Attendance not yet available. Event starts at ${event.start_time} (${timeUntilStart} minutes from now).`
      }
    }
    
    if (phTime > eventEndTime) {
      const timeAfterEnd = Math.ceil((phTime.getTime() - eventEndTime.getTime()) / (1000 * 60)) // minutes
      return {
        isActive: false,
        message: `Attendance is no longer available. Event ended at ${event.end_time} (${timeAfterEnd} minutes ago).`
      }
    }
    
    // Event is currently active
    const timeUntilEnd = Math.ceil((eventEndTime.getTime() - phTime.getTime()) / (1000 * 60)) // minutes
    return {
      isActive: true,
      message: `Event is currently active. Time remaining: ${timeUntilEnd} minutes.`
    }
    
  } catch (error) {
    console.error('Error checking event time window:', error)
    return {
      isActive: false,
      message: 'Unable to verify event timing. Please try again.'
    }
  }
}

// Helper function to check student eligibility based on event scope
async function checkStudentEligibility(student: any, event: any): Promise<boolean> {
  switch (event.scope_type) {
    case 'UNIVERSITY_WIDE':
      return true // All students are eligible

    case 'COLLEGE_WIDE':
      return student.college === event.scope_college

    case 'COURSE_SPECIFIC':
      return student.college === event.scope_college && 
             student.course === event.scope_course

    default:
      return false
  }
} 