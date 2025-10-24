import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"

const bulkScanSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "At least one student ID is required"),
  eventId: z.string().min(1, "Event ID is required"),
  mode: z.enum(['SIGN_IN', 'SIGN_OUT'], {
    required_error: "Mode must be either SIGN_IN or SIGN_OUT"
  }),
  adminOverride: z.boolean().optional().default(false)
})

interface BulkAttendanceResult {
  success: string[]
  failed: Array<{ studentId: string; error: string }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { studentIds, eventId, mode, adminOverride } = bulkScanSchema.parse(body)

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
    // Skip time validation if admin override is enabled
    if (!adminOverride) {
      const timeValidation = checkEventTimeWindow(event)
      if (!timeValidation.isActive) {
        return NextResponse.json({ 
          success: false,
          error: timeValidation.message 
        }, { status: 400 })
      }
    }

    // 3. Process each student ID
    const results: BulkAttendanceResult = {
      success: [],
      failed: [],
      summary: {
        total: studentIds.length,
        successful: 0,
        failed: 0
      }
    }

    for (const studentId of studentIds) {
      try {
        // Find student by student_id
        const { data: student, error: studentError } = await supabaseAdmin
          .from('students')
          .select('*')
          .eq('student_id', studentId.trim())
          .single()

        if (studentError || !student) {
          results.failed.push({
            studentId,
            error: 'Student not found'
          })
          continue
        }

        // Check student eligibility based on event scope
        const isEligible = await checkStudentEligibility(student, event)
        if (!isEligible) {
          results.failed.push({
            studentId,
            error: 'Not eligible for this event'
          })
          continue
        }

        // Get current attendance status for this student-event combination
        const { data: existingAttendance, error: attendanceCheckError } = await supabaseAdmin
          .from('attendance')
          .select('*')
          .eq('event_id', eventId)
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (attendanceCheckError && attendanceCheckError.code !== 'PGRST116') {
          results.failed.push({
            studentId,
            error: 'Failed to check attendance status'
          })
          continue
        }

        const latestRecord = existingAttendance?.[0]

        // Validate sign-in/sign-out logic
        if (mode === 'SIGN_IN') {
          // Check if student is already signed in
          if (latestRecord && latestRecord.mode === 'SIGN_IN' && !latestRecord.time_out) {
            results.failed.push({
              studentId,
              error: 'Already signed in'
            })
            continue
          }
        } else if (mode === 'SIGN_OUT') {
          // Check if student can sign out
          if (!latestRecord || latestRecord.mode !== 'SIGN_IN' || latestRecord.time_out) {
            results.failed.push({
              studentId,
              error: 'Must sign in first or already signed out'
            })
            continue
          }
        }

        // Record the attendance
        const currentTime = new Date().toISOString()

        if (mode === 'SIGN_IN') {
          // Create new sign-in record
          const { error: insertError } = await supabaseAdmin
            .from('attendance')
            .insert([{
              event_id: eventId,
              student_id: student.id,
              status: 'PRESENT',
              mode: 'SIGN_IN',
              time_in: currentTime,
              time_out: null
            }])

          if (insertError) {
            results.failed.push({
              studentId,
              error: 'Failed to record sign-in'
            })
            continue
          }
        } else {
          // Update existing record with sign-out time
          const { error: updateError } = await supabaseAdmin
            .from('attendance')
            .update({
              time_out: currentTime,
              updated_at: currentTime
            })
            .eq('id', latestRecord.id)

          if (updateError) {
            results.failed.push({
              studentId,
              error: 'Failed to record sign-out'
            })
            continue
          }
        }

        // Success
        results.success.push(`${student.name} (${studentId})`)

      } catch (error) {
        console.error(`Error processing student ${studentId}:`, error)
        results.failed.push({
          studentId,
          error: 'Processing error'
        })
      }
    }

    // Update summary
    results.summary.successful = results.success.length
    results.summary.failed = results.failed.length

    return NextResponse.json({
      success: true,
      results
    }, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: error.errors[0].message 
      }, { status: 400 })
    }

    console.error('Error in bulk scan endpoint:', error)
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

