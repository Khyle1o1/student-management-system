# Fee Approval Email Notification - Quick Start Guide

## What Was Implemented

✅ **Automatic email notifications** sent to ALL admins when College Org/Course Org submits a fee  
✅ **Enhanced frontend message** showing "Admin has been notified via email for approval"  
✅ **Professional email template** with fee details and approval link  
✅ **Persistent dashboard notifications** until fee is approved  
✅ **Complete logging** of all email notifications  

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Migrations

Open your **Supabase SQL Editor** and run **BOTH** of these:

#### A) Add notification type (Required)
```sql
-- File: add_fee_pending_approval_notification_type.sql

ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check;

ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_notification_type_check 
  CHECK (notification_type IN ('event_1day', 'event_1hour', 'fee_assigned', 'fee_3days', 'certificate', 'fee_pending_approval'));

COMMENT ON COLUMN notification_logs.notification_type IS 
  'Type of notification: event_1day (1 day before event), event_1hour (1 hour before event), fee_assigned (when fee is assigned to student), fee_3days (3 days before fee due date), certificate (certificate ready), fee_pending_approval (fee submitted by org pending admin approval)';
```

#### B) Enable notifications (Critical!)
```sql
-- File: fix_notification_settings_missing.sql
-- This fixes: "Notifications are disabled" error

INSERT INTO notification_settings (
  enabled,
  sender_email,
  sender_name,
  reply_to,
  event_reminder_1_day,
  event_reminder_1_hour,
  fee_reminder_on_assignment,
  fee_reminder_3_days,
  certificate_notification
)
SELECT 
  true,
  'noreply@smartu.edu',
  'SmartU',
  'support@smartu.edu',
  true, true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM notification_settings LIMIT 1);

-- Verify it worked:
SELECT enabled, sender_email FROM notification_settings;
```

**Expected Result:** Should show `enabled: true`

### Step 2: Verify Email Configuration

Check your `.env` file has SMTP settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@smartu.edu
SMTP_FROM_NAME=SmartU
```

**Using Gmail?** 
1. Enable 2-Factor Authentication
2. Generate App Password (Google Account → Security → App Passwords)
3. Use app password in `SMTP_PASS`

### Step 3: Restart Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## ✅ That's It! Test the Feature

### Test as College Organization:

1. Login as College Org user
2. Go to **Dashboard → Fees → New Fee**
3. Fill in fee details:
   - Name: "Test Organization Fee"
   - Amount: 100
   - Type: Organization Fee
   - School Year: 2024-2025
   - Scope: College-wide (select your college)
4. Click **"Create Fee"**

### ✅ Expected Results:

**Frontend (College Org sees):**
```
✓ Success popup appears
✓ Title: "Fee submitted successfully"
✓ Message: "Your fee has been submitted and is pending approval"
✓ Message: "✓ Admin has been notified via email for approval"
```

**Backend (Console logs):**
```
Found 2 admin(s) to notify about pending fee
Pending fee notification sent to admin: admin1@example.com
Pending fee notification sent to admin: admin2@example.com
Admin email notifications: 2 sent, 0 failed
```

**Email (Admin receives):**
```
From: SmartU <noreply@smartu.edu>
Subject: New Fee Pending Approval: Test Organization Fee

[Beautiful HTML email with:]
- Fee details (name, amount, scope)
- Submitter info (name, role)
- Status: Pending Approval
- "Review Fee" button → links to dashboard
```

**Admin Dashboard:**
```
✓ Notification appears in admin dashboard
✓ Shows: "Fee awaiting approval"
✓ Message: "COLLEGE_ORG [Name] created a fee pending admin approval"
✓ Remains visible until admin approves fee
```

## 📊 Verify It's Working

### Check Console Logs:
```bash
# Look for these messages:
✓ "Found X admin(s) to notify about pending fee"
✓ "Pending fee notification sent to admin: email@example.com"
✓ "Admin email notifications: X sent, 0 failed"
```

### Check Database:
```sql
-- View notification logs
SELECT 
  recipient_email,
  subject,
  status,
  sent_at,
  error_message
FROM notification_logs
WHERE notification_type = 'fee_pending_approval'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Admin Email:
- Open admin's email inbox
- Look for email from "SmartU"
- Subject: "New Fee Pending Approval: [Fee Name]"
- Click "Review Fee" button → should open dashboard

## 🎯 How It Works

### User Flow:

```
College Org creates fee
        ↓
Fee saved with status = PENDING
        ↓
System finds all admin users
        ↓
Email sent to each admin
        ↓
Notification logged in database
        ↓
Frontend shows success message
        ↓
Admin receives email
        ↓
Admin logs in and approves fee
        ↓
Fee activated and assigned to students
```

### Automatic Process (No User Action Required):

✅ Fee creation triggers email automatically  
✅ All admins notified simultaneously  
✅ No manual email sending needed  
✅ Notification logged for tracking  
✅ Errors handled gracefully (fee still created)  

## 🔧 Troubleshooting

### ❌ "Notifications are disabled" in Console?

**Problem:** Error shows `"Notifications are disabled"` and `"0 sent, 0 failed"`

**Cause:** Missing default settings in `notification_settings` table

**Fix:** Run this SQL immediately:
```sql
-- File: fix_notification_settings_missing.sql
INSERT INTO notification_settings (
  enabled, sender_email, sender_name, reply_to,
  event_reminder_1_day, event_reminder_1_hour,
  fee_reminder_on_assignment, fee_reminder_3_days, certificate_notification
)
SELECT true, 'noreply@smartu.edu', 'SmartU', 'support@smartu.edu',
       true, true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM notification_settings LIMIT 1);
```

**Verify:**
```sql
SELECT enabled FROM notification_settings;
-- Should return: enabled = true
```

### ❌ Emails Not Sending?

**Check SMTP Configuration:**
```bash
# Test SMTP connection
# Go to: Dashboard → Notifications → Settings
# Click "Send Test Email"
# Enter your email
# Check if you receive it
```

**Common Issues:**
- Gmail: Use App Password (not account password)
- Wrong SMTP host/port
- Firewall blocking port 587
- Invalid credentials

### ❌ Admin Not Receiving Emails?

**Verify Admin Has Email:**
```sql
SELECT id, name, email, role 
FROM users 
WHERE role = 'ADMIN';
```

If email is NULL:
```sql
UPDATE users 
SET email = 'admin@example.com' 
WHERE id = 'admin-user-id';
```

### ❌ Success Message Not Showing?

**Clear browser cache:**
- Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- Or: Clear browser cache and reload

## 📧 Email Template Preview

### What Admins See:

**Subject:**
```
New Fee Pending Approval: [Fee Name]
```

**Email Body:**
```
┌─────────────────────────────────────┐
│         SmartU                       │
│   Smart Solutions for a Smarter     │
│           BukSU                      │
└─────────────────────────────────────┘

⏳ New Fee Pending Approval

Hi Admin Name,

A new fee has been submitted and requires 
your approval before it can be activated.

┌─────────────────────────────────────┐
│ 📋 Fee Details:                     │
│                                     │
│ Fee Name: Test Organization Fee    │
│ Amount: ₱100.00                    │
│ Scope: College of Technologies     │
│ Status: Pending Approval           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 👤 Submitted By:                    │
│ John Doe                            │
│ Role: College Organization          │
└─────────────────────────────────────┘

      [Review Fee] ← Button

Note: This fee will remain pending until 
you approve it. Notifications will remain 
visible until action is taken.
```

## 📝 Files Modified

All changes have been implemented in:

1. ✅ `src/lib/email-service.ts` - Email template added
2. ✅ `src/lib/notification-helpers.ts` - Admin notification function
3. ✅ `src/app/api/fees/route.ts` - Trigger email on fee creation
4. ✅ `src/components/dashboard/fee-form.tsx` - Enhanced success message
5. ✅ `add_fee_pending_approval_notification_type.sql` - Database migration

## 🎓 User Roles Behavior

### Admin:
- Creates fee → Immediately ACTIVE ✓
- Does NOT receive email (their own fee)
- No approval needed

### College Organization:
- Creates fee → Status: PENDING ⏳
- Success message: "Admin has been notified via email"
- Must wait for admin approval
- Email sent to ALL admins

### Course Organization:
- Creates fee → Status: PENDING ⏳
- Success message: "Admin has been notified via email"
- Must wait for admin approval
- Email sent to ALL admins

## 📚 Additional Resources

- **Full Documentation:** `FEE_PENDING_APPROVAL_EMAIL_NOTIFICATION.md`
- **Email System Guide:** `NOTIFICATION_SYSTEM_README.md`
- **SMTP Setup:** `EMAIL_REMINDERS_SETUP.md`

## ✅ Feature Checklist

Before deploying to production:

- [ ] Database migration executed
- [ ] SMTP configuration verified
- [ ] Test email sent successfully
- [ ] Test fee created by org user
- [ ] Admin received email
- [ ] Email template displays correctly
- [ ] "Review Fee" button works
- [ ] Console logs show success
- [ ] Notification logs recorded in database
- [ ] Frontend message displays correctly

## 🎉 Success!

Your system now automatically notifies admins whenever fees are submitted for approval. No manual intervention needed!

**Key Benefits:**
- ✅ Instant notifications to all admins
- ✅ Professional email template
- ✅ Clear frontend feedback
- ✅ Complete audit trail
- ✅ Seamless user experience

---

**Need Help?**

Check the console logs or database for error details:
```bash
npm run dev
# Watch for: "Admin email notifications: X sent, Y failed"
```

**Built with ❤️ for SmartU**


