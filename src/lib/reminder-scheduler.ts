import { supabase } from './supabase'
import { sendEventReminder, sendFeeReminder, sendCertificateNotification } from './email-service'

interface NotificationSettings {
  enabled: boolean
  event_reminder_1_day: boolean
  event_reminder_1_hour: boolean
  fee_reminder_on_assignment: boolean
  fee_reminder_3_days: boolean
  certificate_notification: boolean
}

// Log notification attempt
async function logNotification(data: {
  recipient_email: string
  recipient_name: string
  subject: string
  notification_type: string
  status: 'sent' | 'failed'
  message_id?: string
  error_message?: string
  event_id?: string
  fee_id?: string
  certificate_id?: string
  student_id?: string
  email_html?: string
  email_text?: string
}) {
  try {
    await supabase.from('notification_logs').insert({
      ...data,
      sent_at: data.status === 'sent' ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error('Error logging notification:', error)
  }
}

// Process event reminders (1 day before)
export async function processEvent1DayReminders() {
  try {
    // Get settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .single()

    if (!settings?.enabled || !settings?.event_reminder_1_day) {
      console.log('Event 1-day reminders are disabled')
      return { processed: 0, sent: 0, failed: 0 }
    }

    // Get events happening in 24 hours (±1 hour buffer)
    const tomorrow = new Date()
    tomorrow.setHours(tomorrow.getHours() + 24)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: events, error } = await supabase
      .from('events')
      .select('*, attendances(*)')
      .eq('event_date', tomorrowStr)
      .eq('status', 'UPCOMING')

    if (error || !events) {
      console.error('Error fetching events:', error)
      return { processed: 0, sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    // For each event, send reminders to registered students
    for (const event of events) {
      // Get students registered for this event
      const { data: attendances } = await supabase
        .from('attendances')
        .select('student_id, students(id, full_name, email)')
        .eq('event_id', event.id)

      if (!attendances) continue

      for (const attendance of attendances) {
        const student: any = attendance.students
        if (!student?.email) continue

        // Check if reminder already sent
        const { data: existingLog } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('event_id', event.id)
          .eq('student_id', student.id)
          .eq('notification_type', 'event_1day')
          .single()

        if (existingLog) continue // Already sent

        const result = await sendEventReminder(
          student.email,
          student.full_name,
          event.title,
          new Date(event.event_date).toLocaleDateString(),
          `${event.start_time} - ${event.end_time}`,
          event.location,
          '1day'
        )

        await logNotification({
          recipient_email: student.email,
          recipient_name: student.full_name,
          subject: `Reminder: ${event.title} in 1 day`,
          notification_type: 'event_1day',
          status: result.success ? 'sent' : 'failed',
          message_id: result.messageId,
          error_message: result.error,
          event_id: event.id,
          student_id: student.id,
        })

        if (result.success) sent++
        else failed++
      }
    }

    return { processed: events.length, sent, failed }
  } catch (error) {
    console.error('Error processing 1-day event reminders:', error)
    return { processed: 0, sent: 0, failed: 0 }
  }
}

// Process event reminders (1 hour before)
export async function processEvent1HourReminders() {
  try {
    // Get settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .single()

    if (!settings?.enabled || !settings?.event_reminder_1_hour) {
      console.log('Event 1-hour reminders are disabled')
      return { processed: 0, sent: 0, failed: 0 }
    }

    // Get events happening in ~1 hour
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    const twoHoursLater = new Date(now.getTime() + 120 * 60 * 1000)
    
    const todayStr = now.toISOString().split('T')[0]

    const { data: events, error } = await supabase
      .from('events')
      .select('*, attendances(*)')
      .eq('event_date', todayStr)
      .eq('status', 'UPCOMING')
      .gte('start_time', oneHourLater.toTimeString().slice(0, 5))
      .lte('start_time', twoHoursLater.toTimeString().slice(0, 5))

    if (error || !events) {
      console.error('Error fetching events:', error)
      return { processed: 0, sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    for (const event of events) {
      const { data: attendances } = await supabase
        .from('attendances')
        .select('student_id, students(id, full_name, email)')
        .eq('event_id', event.id)

      if (!attendances) continue

      for (const attendance of attendances) {
        const student: any = attendance.students
        if (!student?.email) continue

        // Check if reminder already sent
        const { data: existingLog } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('event_id', event.id)
          .eq('student_id', student.id)
          .eq('notification_type', 'event_1hour')
          .single()

        if (existingLog) continue

        const result = await sendEventReminder(
          student.email,
          student.full_name,
          event.title,
          new Date(event.event_date).toLocaleDateString(),
          `${event.start_time} - ${event.end_time}`,
          event.location,
          '1hour'
        )

        await logNotification({
          recipient_email: student.email,
          recipient_name: student.full_name,
          subject: `Reminder: ${event.title} in 1 hour`,
          notification_type: 'event_1hour',
          status: result.success ? 'sent' : 'failed',
          message_id: result.messageId,
          error_message: result.error,
          event_id: event.id,
          student_id: student.id,
        })

        if (result.success) sent++
        else failed++
      }
    }

    return { processed: events.length, sent, failed }
  } catch (error) {
    console.error('Error processing 1-hour event reminders:', error)
    return { processed: 0, sent: 0, failed: 0 }
  }
}

// Process fee reminders (3 days before due date)
export async function processFee3DaysReminders() {
  try {
    // Get settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .single()

    if (!settings?.enabled || !settings?.fee_reminder_3_days) {
      console.log('Fee 3-day reminders are disabled')
      return { processed: 0, sent: 0, failed: 0 }
    }

    // Get fees due in 3 days that are unpaid
    const threeDaysLater = new Date()
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0]

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, students(id, full_name, email), fee_structures(title, amount)')
      .eq('due_date', threeDaysStr)
      .eq('status', 'UNPAID')

    if (error || !payments) {
      console.error('Error fetching payments:', error)
      return { processed: 0, sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    for (const payment of payments) {
      const student: any = payment.students
      const fee: any = payment.fee_structures
      
      if (!student?.email || !fee) continue

      // Check if reminder already sent
      const { data: existingLog } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('fee_id', payment.fee_id)
        .eq('student_id', student.id)
        .eq('notification_type', 'fee_3days')
        .single()

      if (existingLog) continue

      const result = await sendFeeReminder(
        student.email,
        student.full_name,
        fee.title,
        fee.amount,
        new Date(payment.due_date).toLocaleDateString(),
        '3days'
      )

      await logNotification({
        recipient_email: student.email,
        recipient_name: student.full_name,
        subject: `Reminder: Fee Due in 3 Days - ${fee.title}`,
        notification_type: 'fee_3days',
        status: result.success ? 'sent' : 'failed',
        message_id: result.messageId,
        error_message: result.error,
        fee_id: payment.fee_id,
        student_id: student.id,
      })

      if (result.success) sent++
      else failed++
    }

    return { processed: payments.length, sent, failed }
  } catch (error) {
    console.error('Error processing 3-day fee reminders:', error)
    return { processed: 0, sent: 0, failed: 0 }
  }
}

// Run all scheduled reminders
export async function runScheduledReminders() {
  console.log('Running scheduled reminders...')
  
  const results = await Promise.all([
    processEvent1DayReminders(),
    processEvent1HourReminders(),
    processFee3DaysReminders(),
  ])

  const totals = results.reduce(
    (acc, result) => ({
      processed: acc.processed + result.processed,
      sent: acc.sent + result.sent,
      failed: acc.failed + result.failed,
    }),
    { processed: 0, sent: 0, failed: 0 }
  )

  console.log('Scheduled reminders completed:', totals)
  return totals
}

