# Event Email Notifications - Quick Implementation Guide

## ✅ Status: Email Template Created

I've added the event email notification template to `src/lib/email-service.ts`.

## 🚀 Remaining Steps (Complete Implementation)

### Step 1: Add Helper Function to `src/lib/notification-helpers.ts`

Add this function at the end of the file (after `notifyAdminsPendingFee`):

```typescript
/**
 * Send pending event approval notification to all admins
 */
export async function notifyAdminsPendingEvent(
  eventId: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  location: string,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  try {
    console.log('📧 [EVENT NOTIFICATION] Starting event approval notification process...')

    const settings = await getNotificationSettings()
    
    if (!settings?.enabled) {
      console.log('❌ [EVENT NOTIFICATION] Notifications are disabled')
      return { sent: 0, failed: 0 }
    }

    // Get all admin users
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('role', 'ADMIN')
      .not('email', 'is', null)

    if (adminsError || !admins || admins.length === 0) {
      console.error('❌ [EVENT NOTIFICATION] No admin users found')
      return { sent: 0, failed: 0 }
    }

    console.log(`✅ [EVENT NOTIFICATION] Found ${admins.length} admin(s) to notify`)

    // Send email to each admin
    for (const admin of admins) {
      try {
        const result = await sendPendingEventApprovalNotification(
          admin.email,
          admin.name || 'Admin',
          eventTitle,
          eventDate,
          eventTime,
          location,
          submittedBy,
          submitterRole,
          scopeType,
          scopeCollege,
          scopeCourse
        )

        // Log notification
        await logNotification({
          recipient_email: admin.email,
          recipient_name: admin.name || 'Admin',
          subject: `New Event Pending Approval: ${eventTitle}`,
          notification_type: 'event_pending_approval',
          status: result.success ? 'sent' : 'failed',
          message_id: result.messageId,
          error_message: result.error,
          event_id: eventId,
        })

        if (result.success) {
          console.log(`✅ [EVENT NOTIFICATION] Successfully sent to: ${admin.email}`)
          sent++
        } else {
          console.error(`❌ [EVENT NOTIFICATION] Failed to send to ${admin.email}`)
          failed++
        }
      } catch (error) {
        console.error(`❌ [EVENT NOTIFICATION] Exception:`, error)
        failed++
      }
    }

    console.log(`📊 [EVENT NOTIFICATION] Final results: ${sent} sent, ${failed} failed`)
    return { sent, failed }
  } catch (error) {
    console.error('❌ [EVENT NOTIFICATION] Fatal error:', error)
    return { sent, failed }
  }
}
```

Don't forget to add the import at the top:

```typescript
import { sendPendingEventApprovalNotification } from './email-service'
```

### Step 2: Update Event Creation API `src/app/api/events/route.ts`

Find line 138 where it says `if (!isAdmin) {` and add the email notification after the in-app notification code:

```typescript
if (!isAdmin) {
  // ... existing notification code (lines 138-170) ...
  
  // ADD THIS - Send email notification to all admins
  try {
    const roleDisplayName = session.user.role === 'COLLEGE_ORG' ? 'College Organization' : 
                            session.user.role === 'COURSE_ORG' ? 'Course Organization' : session.user.role
    
    const eventTime = (event as any)?.start_time 
      ? `${(event as any)?.start_time}${(event as any)?.end_time ? ` - ${(event as any)?.end_time}` : ''}` 
      : 'TBA'
    
    const notificationResult = await notifyAdminsPendingEvent(
      (event as any)?.id,
      (event as any)?.title,
      (event as any)?.date,
      eventTime,
      (event as any)?.location || 'TBA',
      session.user.name || 'Unknown User',
      roleDisplayName,
      (event as any)?.scope_type,
      (event as any)?.scope_college,
      (event as any)?.scope_course
    )

    console.log(`Admin email notifications: ${notificationResult.sent} sent, ${notificationResult.failed} failed`)
  } catch (emailError) {
    // Don't fail event creation if email fails
    console.error('Error sending admin email notifications:', emailError)
  }
}
```

Add import at the top of the file:

```typescript
import { notifyAdminsPendingEvent } from '@/lib/notification-helpers'
```

### Step 3: Update Event Form Component `src/components/dashboard/event-form.tsx`

Find the success handling around line 440 and update it:

```typescript
if (response.ok) {
  console.log("Event created/updated successfully")
  
  // Different messages for admins vs org users
  const isOrgUser = role === 'COLLEGE_ORG' || role === 'COURSE_ORG'
  
  if (!isEditing && isOrgUser) {
    // Org user creating new event
    await Swal.fire({
      icon: "success",
      title: "Event submitted successfully",
      html: `
        <p style="margin-bottom: 10px;">Your event has been submitted and is pending approval.</p>
        <p style="color: #4caf50; font-weight: bold;">✓ Admin has been notified via email for approval.</p>
      `,
      confirmButtonColor: "#0f172a",
    })
  } else {
    // Admin or edit operation
    await Swal.fire({
      icon: "success",
      title: isEditing ? "Event updated" : "Event created",
      text: isEditing ? "The event has been updated successfully." : "The event has been created and activated successfully.",
      confirmButtonColor: "#0f172a",
    })
  }
  
  router.push("/dashboard/events")
} else {
  // ... existing error handling ...
}
```

Add import at the top:

```typescript
import { useSession } from "next-auth/react"
const { data: session } = useSession()
const role = session?.user?.role
```

### Step 4: Update Database Migration

Run this SQL in Supabase:

```sql
-- Add event_pending_approval notification type
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check;

ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_notification_type_check 
  CHECK (notification_type IN (
    'event_1day', 
    'event_1hour', 
    'fee_assigned', 
    'fee_3days', 
    'certificate', 
    'fee_pending_approval',
    'event_pending_approval'
  ));
```

### Step 5: Restart Server

```bash
npm run dev
```

---

## 🧪 Testing

1. **Login as College Org**
2. **Create Event:**
   - Title: "Test Event"
   - Date: Tomorrow
   - Location: "Test Location"
3. **Submit**
4. **Verify:**
   - Success popup shows: "Admin has been notified via email"
   - Console shows: "Admin email notifications: X sent, 0 failed"
   - Admin receives email

---

## 📧 Email Features

### Subject Line
```
New Event Pending Approval: [Event Title]
```

### Email Content
- Event details (title, date, time, location, scope)
- Submitter information (name, role)
- Status indicator (Pending Approval)
- "Review Event" button → links to `/dashboard/events`
- Green theme (different from fee's yellow theme)
- Professional SmartU branding

---

## ✅ Benefits

- ✅ Immediate email notification to all admins
- ✅ Professional email template
- ✅ Clear confirmation for submitters
- ✅ Complete audit trail
- ✅ Consistent with fee notification system

---

**Status:** Email template ready ✓  
**Next:** Complete Steps 1-5 above to enable event email notifications

**Built with ❤️ for SmartU**

