import { supabase } from './supabase'
import { NotificationType, NotificationData } from './supabase'

export interface CreateNotificationData {
  userId?: string
  studentId?: string
  type: NotificationType
  title: string
  message: string
  data?: NotificationData
  expiresAt?: Date
}

export async function createNotification(notificationData: CreateNotificationData) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: notificationData.userId || null,
        student_id: notificationData.studentId || null,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || null,
        expires_at: notificationData.expiresAt?.toISOString() || null,
        is_read: false
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return { success: false, error: error.message }
    }

    console.log('Notification created successfully:', data.id)
    return { success: true, notification: data }

  } catch (error) {
    console.error('Error in createNotification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Replace email functions with notification functions

export interface AttendanceNotificationData {
  studentId: string
  userId?: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  requiresEvaluation: boolean
  evaluationUrl?: string
  certificateUrl?: string
  eventId: string
}

export async function createAttendanceConfirmationNotification(data: AttendanceNotificationData) {
  const title = `Attendance Confirmed: ${data.eventTitle}`
  
  let message = `Your attendance has been successfully recorded for ${data.eventTitle} on ${data.eventDate}.`
  
  if (data.requiresEvaluation) {
    message += ` Please complete the event evaluation to access your certificate.`
  } else {
    message += ` Your certificate is now available for download.`
  }

  const notificationData: NotificationData = {
    event_id: data.eventId,
    event_title: data.eventTitle,
    event_date: data.eventDate,
    evaluation_url: data.evaluationUrl,
    certificate_url: data.certificateUrl
  }

  return await createNotification({
    userId: data.userId,
    studentId: data.studentId,
    type: 'ATTENDANCE_CONFIRMED',
    title,
    message,
    data: notificationData
  })
}

export interface EvaluationReminderNotificationData {
  studentId: string
  userId?: string
  eventTitle: string
  evaluationUrl: string
  eventId: string
  daysRemaining?: number
}

export async function createEvaluationReminderNotification(data: EvaluationReminderNotificationData) {
  const title = `Evaluation Required: ${data.eventTitle}`
  
  let message = `You attended ${data.eventTitle} and need to complete the event evaluation to access your certificate.`
  
  if (data.daysRemaining) {
    message += ` You have ${data.daysRemaining} days remaining.`
  }

  const notificationData: NotificationData = {
    event_id: data.eventId,
    event_title: data.eventTitle,
    evaluation_url: data.evaluationUrl
  }

  return await createNotification({
    userId: data.userId,
    studentId: data.studentId,
    type: 'EVALUATION_REQUIRED',
    title,
    message,
    data: notificationData
  })
}

export interface CertificateAvailableNotificationData {
  studentId: string
  userId?: string
  eventTitle: string
  certificateUrl: string
  certificateNumber: string
  certificateId: string
  eventId: string
}

export async function createCertificateAvailableNotification(data: CertificateAvailableNotificationData) {
  const title = `Certificate Ready: ${data.eventTitle}`
  
  const message = `Your certificate of participation for ${data.eventTitle} is now ready for download. Certificate #${data.certificateNumber}`

  const notificationData: NotificationData = {
    event_id: data.eventId,
    certificate_id: data.certificateId,
    certificate_url: data.certificateUrl,
    event_title: data.eventTitle
  }

  return await createNotification({
    userId: data.userId,
    studentId: data.studentId,
    type: 'CERTIFICATE_READY',
    title,
    message,
    data: notificationData
  })
}

// Utility functions for managing notifications

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) {
      console.error('Error marking notification as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true, notification: data }

  } catch (error) {
    console.error('Error in markNotificationAsRead:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function markAllNotificationsAsRead(userId?: string, studentId?: string) {
  try {
    let query = supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { error, count } = await query.eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true, count: count || 0 }

  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('Error deleting notification:', error)
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Error in deleteNotification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
} 