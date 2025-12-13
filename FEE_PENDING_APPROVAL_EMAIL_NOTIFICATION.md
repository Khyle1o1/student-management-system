# Fee Pending Approval Email Notification System

## Overview

This feature automatically sends email notifications to all admin users whenever a College Organization or Course Organization submits a new fee with pending status. The system ensures that admins are immediately notified via email about fees requiring approval, and the frontend provides clear confirmation to the submitter.

## Features Implemented

### ✅ 1. Automatic Email Notifications

When a College Org or Course Org creates a fee:
- **Fee Status**: Automatically set to `PENDING` (requires admin approval)
- **Email Trigger**: Immediate email notification sent to ALL admin users
- **Notification Content**: Professional email with fee details, submitter info, and approval link
- **Logging**: All notifications logged in `notification_logs` table for tracking

### ✅ 2. Enhanced Frontend Feedback

**For Organization Users (College Org / Course Org):**
- Success message: "Fee submitted successfully"
- Additional message: "Admin has been notified via email for approval"
- Visual confirmation with green checkmark

**For Admin Users:**
- Success message: "Fee created and activated successfully"
- Fee is immediately active (no approval needed)

### ✅ 3. Persistent Dashboard Notifications

- In-app notification created in `notifications` table
- Visible in admin dashboard until fee is approved
- Activity logged in `activity_logs` for audit trail

### ✅ 4. Professional Email Template

Beautiful, responsive HTML email template including:
- SmartU branding (navy blue theme)
- Fee details (name, amount, scope)
- Submitter information (name and role)
- Status indicator (Pending Approval)
- Direct "Review Fee" button linking to dashboard
- Note explaining fee remains pending until approved

## Technical Implementation

### Files Modified/Created

#### 1. **Email Service** (`src/lib/email-service.ts`)

**New Function:**
```typescript
sendPendingFeeApprovalNotification(
  adminEmail: string,
  adminName: string,
  feeName: string,
  feeAmount: number,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
)
```

**New Template:**
```typescript
generatePendingFeeApprovalTemplate(...)
```

Features:
- Responsive HTML email design
- Navy blue gradient header with SmartU branding
- Fee details in highlighted warning box (yellow)
- Submitter info in blue info box
- Direct action button to review fee
- Professional footer with automated notification disclaimer

#### 2. **Notification Helpers** (`src/lib/notification-helpers.ts`)

**New Function:**
```typescript
notifyAdminsPendingFee(
  feeId: string,
  feeName: string,
  feeAmount: number,
  submittedBy: string,
  submitterRole: string,
  scopeType: string,
  scopeCollege?: string,
  scopeCourse?: string
): Promise<{ sent: number; failed: number }>
```

This function:
- Fetches all admin users from database
- Checks if email notifications are enabled
- Sends individual email to each admin
- Logs each notification attempt (success/failure)
- Returns count of sent/failed emails
- Handles errors gracefully (doesn't fail fee creation)

#### 3. **Fee Creation API** (`src/app/api/fees/route.ts`)

**Enhanced Logic:**
```typescript
// After fee creation by non-admin
if (!isAdmin) {
  // ... existing notification code ...
  
  // NEW: Send email notification to all admins
  const notificationResult = await notifyAdminsPendingFee(
    fee.id,
    fee.name,
    fee.amount,
    actor.name,
    roleDisplayName,
    fee.scope_type,
    fee.scope_college,
    fee.scope_course
  )
  
  console.log(`Admin emails: ${notificationResult.sent} sent, ${notificationResult.failed} failed`)
}
```

#### 4. **Fee Form Component** (`src/components/dashboard/fee-form.tsx`)

**Enhanced Success Messages:**
```typescript
if (isOrgUser) {
  await Swal.fire({
    icon: "success",
    title: "Fee submitted successfully",
    html: `
      <p>Your fee has been submitted and is pending approval.</p>
      <p style="color: #4caf50; font-weight: bold;">
        ✓ Admin has been notified via email for approval.
      </p>
    `,
  })
}
```

#### 5. **Database Migration** (`add_fee_pending_approval_notification_type.sql`)

Adds new notification type to `notification_logs` constraint:
- Previous types: `event_1day`, `event_1hour`, `fee_assigned`, `fee_3days`, `certificate`
- **New type**: `fee_pending_approval`

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
# File: add_fee_pending_approval_notification_type.sql
```

This adds the `fee_pending_approval` notification type to the database constraint.

### 2. Verify Email Configuration

Ensure your `.env` file has SMTP settings configured:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@smartu.edu
SMTP_FROM_NAME=SmartU
```

### 3. Verify Notification Settings

1. Log in as admin
2. Go to **Dashboard → Notifications → Settings**
3. Ensure "Enable Notifications" is ON
4. Optionally test with "Send Test Email"

### 4. Restart Application

```bash
npm run build
npm run start
# or for development
npm run dev
```

## User Workflow

### For College/Course Organizations:

1. **Create Fee**
   - Navigate to Dashboard → Fees → New Fee
   - Fill in fee details (name, amount, scope, etc.)
   - Click "Create Fee"

2. **Confirmation**
   - Success popup appears
   - Message: "Fee submitted successfully"
   - Message: "✓ Admin has been notified via email for approval"
   - Fee appears in fee list with "PENDING" badge

3. **What Happens Behind the Scenes:**
   - Fee created with `is_active = false` (pending status)
   - System finds all admin users
   - Email sent to each admin with fee details
   - Notification logged in `notification_logs`
   - In-app notification created for admins
   - Activity logged in `activity_logs`

### For Admins:

1. **Receive Notification**
   - Email arrives with subject: "New Fee Pending Approval: [Fee Name]"
   - Email contains:
     - Fee details (name, amount, scope)
     - Submitter information
     - "Review Fee" button

2. **Review Fee**
   - Click "Review Fee" button (or login to dashboard)
   - Go to Dashboard → Fees
   - Pending fees shown with "PENDING" badge
   - Review fee details

3. **Approve Fee**
   - Click on pending fee
   - Review and click "Approve" button
   - Fee status changes to "ACTIVE"
   - Fee assignments to students processed
   - Notification removed from dashboard

## Email Template Preview

### Subject Line
```
New Fee Pending Approval: [Fee Name]
```

### Email Content Structure

**Header:**
- SmartU logo and branding
- Navy blue gradient background

**Main Content:**
- Greeting: "Hi [Admin Name]"
- Context: "A new fee has been submitted and requires your approval..."

**Fee Details Box (Yellow Warning):**
- Fee Name
- Amount (₱X,XXX)
- Scope (University-Wide / College / Course)
- Status: Pending Approval

**Submitter Info Box (Blue):**
- Submitted By: [Name]
- Role: [College Organization / Course Organization]

**Action Button:**
- "Review Fee" button
- Direct link to /dashboard/fees

**Footer Note:**
- Explanation that fee remains pending until approved
- Notification will remain visible until action taken

**Footer:**
- SmartU branding
- "This is an automated notification from SmartU"

## Notification Logging

All email notifications are logged in the `notification_logs` table:

```sql
SELECT 
  recipient_email,
  recipient_name,
  subject,
  notification_type,
  status,
  sent_at,
  error_message
FROM notification_logs
WHERE notification_type = 'fee_pending_approval'
ORDER BY created_at DESC;
```

### Log Fields:
- `recipient_email`: Admin's email address
- `recipient_name`: Admin's name
- `subject`: Email subject line
- `notification_type`: `'fee_pending_approval'`
- `status`: `'sent'` or `'failed'`
- `message_id`: Email provider's message ID
- `error_message`: Error details (if failed)
- `fee_id`: UUID of the pending fee
- `sent_at`: Timestamp of successful send
- `created_at`: Timestamp of notification attempt

## Monitoring & Troubleshooting

### View Notification Logs

**Admin Dashboard:**
1. Go to Dashboard → Notifications → Logs
2. Filter by Type: "Fee Pending Approval"
3. View status: Sent / Failed
4. Retry failed notifications

**Database Query:**
```sql
-- Check recent fee approval notifications
SELECT * FROM notification_logs 
WHERE notification_type = 'fee_pending_approval'
ORDER BY created_at DESC 
LIMIT 10;
```

### Common Issues

#### 1. Emails Not Sending

**Check:**
- SMTP configuration in `.env`
- Notification settings enabled
- Notification logs for error messages

**Test:**
```bash
# View server logs
npm run dev

# Look for:
# "Admin email notifications: X sent, Y failed"
# "Pending fee notification sent to admin: admin@example.com"
```

#### 2. No Admins Receiving Emails

**Verify:**
```sql
-- Check admin users have email addresses
SELECT id, name, email, role 
FROM users 
WHERE role = 'ADMIN';
```

**Fix:**
- Ensure admin users have valid email addresses
- Update admin emails in user management

#### 3. Notification Not Appearing in Dashboard

**Check:**
```sql
-- Verify notification was created
SELECT * FROM notifications 
WHERE type = 'SYSTEM_ACTIVITY' 
AND data->>'action' = 'FEE_CREATED_PENDING'
ORDER BY created_at DESC;
```

### Success Indicators

✅ **Console Logs (Backend):**
```
Found X admin(s) to notify about pending fee
Pending fee notification sent to admin: admin@example.com
Admin email notifications: X sent, 0 failed
```

✅ **Notification Logs Table:**
- Record created with `status = 'sent'`
- `message_id` populated
- `sent_at` timestamp recorded

✅ **Admin Receives Email:**
- Email arrives in inbox
- Contains correct fee details
- "Review Fee" button works

✅ **Frontend Confirmation:**
- Success popup shows
- Green checkmark message displayed
- User redirected to fees page

## Security & Permissions

### Role-Based Access:

**Admin:**
- Can create fees (immediately active)
- Can approve pending fees
- Receives email notifications

**College Organization:**
- Can create fees (pending approval)
- Fee must match assigned college
- Can create college-wide or course-specific fees

**Course Organization:**
- Can create fees (pending approval)
- Fee must match assigned college and course
- Can only create course-specific fees

### Email Privacy:

- Emails sent individually (BCC not used)
- Admin email addresses not exposed to each other
- Only admins receive pending fee notifications
- Fee submitter does NOT receive copy of admin email

## Performance Considerations

### Email Sending:

**Sequential Processing:**
- Emails sent one at a time to each admin
- Prevents overwhelming SMTP server
- Each failure logged independently

**Non-Blocking:**
- Email sending wrapped in try-catch
- Fee creation succeeds even if emails fail
- Errors logged but don't fail transaction

**Scalability:**
```typescript
// Current: 5-10 admins = 5-10 emails (~2-5 seconds)
// If needed: Consider job queue for 50+ admins
```

### Database Impact:

**Minimal:**
- Single fee insert
- Single notification insert
- Single activity log insert
- N email log inserts (one per admin)

**Indexes Used:**
- `users.role` (for finding admins)
- `notification_logs.recipient_email`
- `notification_logs.notification_type`

## Testing

### Manual Testing:

1. **Create Test Organization Account:**
```sql
-- Create test college org user
INSERT INTO users (name, email, role, assigned_college) 
VALUES ('Test Org', 'testorg@example.com', 'COLLEGE_ORG', 'College of Technologies');
```

2. **Login as Test Org:**
   - Navigate to Dashboard → Fees → New Fee
   - Fill in fee details
   - Submit fee

3. **Verify:**
   - Success message displays correctly
   - Email received by admin(s)
   - Fee shows as "PENDING" in fee list
   - Notification appears in admin dashboard

4. **Check Logs:**
   - Console shows "Admin email notifications: X sent, 0 failed"
   - `notification_logs` table has new records

### Automated Testing (Optional):

```typescript
// Test notification function
import { notifyAdminsPendingFee } from '@/lib/notification-helpers'

const result = await notifyAdminsPendingFee(
  'test-fee-id',
  'Test Fee',
  1000,
  'Test User',
  'College Organization',
  'COLLEGE_WIDE',
  'College of Technologies'
)

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`)
```

## Future Enhancements

Potential improvements:
- [ ] SMS notifications for admins
- [ ] Push notifications (web/mobile)
- [ ] Digest emails (daily summary of pending fees)
- [ ] Custom notification preferences per admin
- [ ] Reminder emails if fee not approved within X days
- [ ] Notification when fee is approved (to submitter)
- [ ] Email template customization in admin panel
- [ ] Multi-language support

## Related Documentation

- `NOTIFICATION_SYSTEM_README.md` - Full notification system overview
- `EMAIL_REMINDERS_SETUP.md` - Email configuration guide
- `FEE_MANAGEMENT_IMPLEMENTATION.md` - Fee management system
- `AUTOMATIC_FEE_ASSIGNMENT.md` - Fee assignment system

## Support

For issues or questions:
1. Check notification logs in admin dashboard
2. Review server console logs
3. Verify SMTP configuration
4. Test with "Send Test Email" feature
5. Check database for notification records

---

**✅ Feature Complete**

All components implemented and tested:
- ✅ Email template created
- ✅ Helper function implemented
- ✅ API route updated
- ✅ Frontend enhanced
- ✅ Database migration provided
- ✅ Logging configured
- ✅ Error handling implemented

**Built with ❤️ for SmartU - Smart Solutions for a Smarter BukSU**


