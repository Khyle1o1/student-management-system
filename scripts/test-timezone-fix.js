// Test script to verify timezone fix for attendance system (Philippine Time UTC+8)
// Run with: node scripts/test-timezone-fix.js

// Helper function to safely parse date with Philippine timezone
function parseEventDate(dateString) {
  try {
    // Handle different date formats
    let parsedDate
    
    if (dateString.includes('T')) {
      // Already has time component
      parsedDate = new Date(dateString)
    } else {
      // Just date, add Philippine timezone
      parsedDate = new Date(dateString + 'T00:00:00+08:00')
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

function checkEventTimeWindow(event) {
  try {
    const now = new Date()
    
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
    
    // Create start and end datetime objects in Philippine Time
    // Get the date part in Philippine timezone
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000))
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    
    // Create event times in Philippine timezone
    const eventStartTime = new Date(eventDateOnly)
    eventStartTime.setHours(startHour, startMinute, 0, 0)
    
    const eventEndTime = new Date(eventDateOnly)
    eventEndTime.setHours(endHour, endMinute, 59, 999)
    
    // Convert current time to Philippine time for comparison
    const currentPhTime = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate(), phNow.getHours(), phNow.getMinutes(), phNow.getSeconds())
    const currentDate = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate())
    const eventOnlyDate = new Date(eventDateOnly)
    
    console.log('Current time (UTC):', now.toISOString())
    console.log('Current time (Philippine Time):', new Date(now.getTime() + (8 * 60 * 60 * 1000)).toISOString())
    console.log('Event start time (Philippine Time):', eventStartTime.toISOString())
    console.log('Event end time (Philippine Time):', eventEndTime.toISOString())
    console.log('Current date (Philippine Time):', currentDate.toISOString())
    console.log('Event date (Philippine Time):', eventOnlyDate.toISOString())
    
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
    if (currentPhTime < eventStartTime) {
      const timeUntilStart = Math.ceil((eventStartTime.getTime() - currentPhTime.getTime()) / (1000 * 60)) // minutes
      return {
        isActive: false,
        message: `Attendance not yet available. Event starts at ${event.start_time} (${timeUntilStart} minutes from now).`
      }
    }
    
    if (currentPhTime > eventEndTime) {
      const timeAfterEnd = Math.ceil((currentPhTime.getTime() - eventEndTime.getTime()) / (1000 * 60)) // minutes
      return {
        isActive: false,
        message: `Attendance is no longer available. Event ended at ${event.end_time} (${timeAfterEnd} minutes ago).`
      }
    }
    
    // Event is currently active
    const timeUntilEnd = Math.ceil((eventEndTime.getTime() - currentPhTime.getTime()) / (1000 * 60)) // minutes
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

// Test cases
console.log('=== Testing Philippine Time (UTC+8) Timezone Fix ===\n')

// Get current Philippine time to create a proper test
const nowPh = new Date(new Date().getTime() + (8 * 60 * 60 * 1000))
const currentHour = nowPh.getHours()
console.log('Current Philippine Time:', nowPh.toISOString())
console.log('Current Philippine Hour:', currentHour)

// Test 1: Event happening today that should be active right now
const today = new Date().toISOString().split('T')[0]
const testEvent1 = {
  date: today,
  start_time: currentHour >= 2 ? '08:00' : '00:00', // Ensure event is active
  end_time: currentHour <= 20 ? '23:59' : '08:00'   // Ensure event is active
}

console.log('Test 1: Event happening today that should be active now')
console.log('Event:', testEvent1)
const result1 = checkEventTimeWindow(testEvent1)
console.log('Result:', result1)
console.log('')

// Test 2: Event happening tomorrow
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowStr = tomorrow.toISOString().split('T')[0]
const testEvent2 = {
  date: tomorrowStr,
  start_time: '09:00',
  end_time: '17:00'
}

console.log('Test 2: Event happening tomorrow at 09:00-17:00')
console.log('Event:', testEvent2)
const result2 = checkEventTimeWindow(testEvent2)
console.log('Result:', result2)
console.log('')

// Test 3: Event that happened yesterday
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = yesterday.toISOString().split('T')[0]
const testEvent3 = {
  date: yesterdayStr,
  start_time: '10:00',
  end_time: '18:00'
}

console.log('Test 3: Event that happened yesterday at 10:00-18:00')
console.log('Event:', testEvent3)
const result3 = checkEventTimeWindow(testEvent3)
console.log('Result:', result3)
console.log('')

console.log('=== Test Complete ===')
