import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Helper function to safely parse date (same as barcode-scan)
function parseEventDate(dateString: string): Date {
  try {
    let parsedDate: Date
    
    if (dateString.includes('T')) {
      parsedDate = new Date(dateString)
    } else {
      parsedDate = new Date(dateString + 'T00:00:00')
    }
    
    if (isNaN(parsedDate.getTime())) {
      parsedDate = new Date(dateString)
    }
    
    return parsedDate
  } catch (error) {
    console.error('Error parsing date:', error, 'Date string:', dateString)
    return new Date()
  }
}

// Same function as in barcode-scan
function checkEventTimeWindow(event: any): { isActive: boolean; message: string } {
  try {
    const now = new Date()
    
    const eventDate = parseEventDate(event.date)
    
    if (isNaN(eventDate.getTime())) {
      return {
        isActive: false,
        message: 'Invalid event date format. Please contact administrator.'
      }
    }
    
    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)
    
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    
    const eventStartTime = new Date(eventDateOnly)
    eventStartTime.setHours(startHour, startMinute, 0, 0)
    
    const eventEndTime = new Date(eventDateOnly)
    eventEndTime.setHours(endHour, endMinute, 59, 999)
    
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const eventOnlyDate = new Date(eventDateOnly)
    
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
    
    if (now < eventStartTime) {
      const timeUntilStart = Math.ceil((eventStartTime.getTime() - now.getTime()) / (1000 * 60))
      return {
        isActive: false,
        message: `Attendance not yet available. Event starts at ${event.start_time} (${timeUntilStart} minutes from now).`
      }
    }
    
    if (now > eventEndTime) {
      const timeAfterEnd = Math.ceil((now.getTime() - eventEndTime.getTime()) / (1000 * 60))
      return {
        isActive: false,
        message: `Attendance is no longer available. Event ended at ${event.end_time} (${timeAfterEnd} minutes ago).`
      }
    }
    
    const timeUntilEnd = Math.ceil((eventEndTime.getTime() - now.getTime()) / (1000 * 60))
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const eventId = url.searchParams.get('eventId')
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId parameter required' }, { status: 400 })
    }

    // Get event from database
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      return NextResponse.json({ error: 'Event not found', details: eventError }, { status: 404 })
    }

    const now = new Date()
    const eventDate = parseEventDate(event.date)
    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)
    
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    const eventStartTime = new Date(eventDateOnly)
    eventStartTime.setHours(startHour, startMinute, 0, 0)
    
    const eventEndTime = new Date(eventDateOnly)
    eventEndTime.setHours(endHour, endMinute, 59, 999)
    
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const eventOnlyDate = new Date(eventDateOnly)
    
    const timeValidation = checkEventTimeWindow(event)

    return NextResponse.json({
      debug: {
        serverTime: now.toISOString(),
        serverTimeString: now.toString(),
        eventData: event,
        parsedEventDate: eventDate.toISOString(),
        parsedEventDateString: eventDate.toString(),
        eventStartTime: eventStartTime.toISOString(),
        eventStartTimeString: eventStartTime.toString(),
        eventEndTime: eventEndTime.toISOString(),
        eventEndTimeString: eventEndTime.toString(),
        currentDate: currentDate.toISOString(),
        currentDateString: currentDate.toString(),
        eventOnlyDate: eventOnlyDate.toISOString(),
        eventOnlyDateString: eventOnlyDate.toString(),
        datesMatch: currentDate.getTime() === eventOnlyDate.getTime(),
        nowLessThanStart: now < eventStartTime,
        nowGreaterThanEnd: now > eventEndTime,
        timeUntilStart: Math.ceil((eventStartTime.getTime() - now.getTime()) / (1000 * 60)),
        timeUntilEnd: Math.ceil((eventEndTime.getTime() - now.getTime()) / (1000 * 60)),
      },
      timeValidation
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'Debug API error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
