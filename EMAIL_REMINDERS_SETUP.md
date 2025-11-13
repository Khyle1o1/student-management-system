# Email Reminders Setup Guide

This guide will help you set up the automatic email reminder system for SmartU.

## Features

The email reminder system automatically sends notifications for:

1. **Event Reminders**
   - 1 day before the event
   - 1 hour before the event

2. **Fee Reminders**
   - When a new fee is assigned
   - 3 days before the due date (for unpaid fees)

3. **Certificate Notifications**
   - When a certificate is ready for download

## Setup Steps

### 1. Install Dependencies

The required dependencies are already added to `package.json`. Run:

```bash
npm install
```

### 2. Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@smartu.edu
SMTP_FROM_NAME=SmartU

# Cron Job Secret (for scheduled reminders)
CRON_SECRET=your-secret-token-here
```

#### Using Gmail SMTP

If you're using Gmail:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Create a new app password for "Mail"
5. Use this password in `SMTP_PASS`

**Gmail SMTP Settings:**
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`

#### Using Other Email Providers

**Outlook/Office 365:**
- `SMTP_HOST=smtp.office365.com`
- `SMTP_PORT=587`

**Yahoo:**
- `SMTP_HOST=smtp.mail.yahoo.com`
- `SMTP_PORT=587`

**SendGrid:**
- `SMTP_HOST=smtp.sendgrid.net`
- `SMTP_PORT=587`
- `SMTP_USER=apikey`
- `SMTP_PASS=your-sendgrid-api-key`

### 3. Run Database Migration

Execute the SQL migration to create the necessary tables:

```bash
# Using Supabase SQL Editor
# Copy the contents of sql/notification_system.sql and run it in your Supabase SQL editor
```

Or if you have direct PostgreSQL access:

```bash
psql -h your-host -U your-user -d your-database -f sql/notification_system.sql
```

### 4. Test Email Configuration

1. Log in as an admin
2. Go to **Dashboard → Notifications → Settings**
3. Configure your email settings
4. Enter a test email address
5. Click "Test Event Email", "Test Fee Email", or "Test Certificate Email"
6. Check if you receive the test email

### 5. Set Up Scheduled Reminders

The system needs to run the scheduler periodically to send reminders. You have several options:

#### Option A: Vercel Cron Jobs (Recommended for Vercel deployment)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/notifications/run-scheduler",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs the scheduler every hour.

#### Option B: External Cron Service (EasyCron, cron-job.org)

1. Sign up for a free cron service like [cron-job.org](https://cron-job.org)
2. Create a new cron job with:
   - URL: `https://your-domain.com/api/notifications/run-scheduler`
   - Schedule: Every hour (or as preferred)
   - HTTP Method: POST
   - Headers: `Authorization: Bearer your-secret-token-here`

#### Option C: Linux Cron Job (for self-hosted servers)

Add to your crontab:

```bash
0 * * * * curl -X POST https://your-domain.com/api/notifications/run-scheduler -H "Authorization: Bearer your-secret-token-here"
```

#### Option D: Manual Trigger (for testing)

You can manually trigger the scheduler by visiting:

```
https://your-domain.com/api/notifications/run-scheduler
```

Or using curl:

```bash
curl -X GET https://your-domain.com/api/notifications/run-scheduler
```

## Admin Configuration

### Notification Settings

Navigate to **Dashboard → Notifications → Settings** to configure:

1. **Email Configuration**
   - Enable/disable all notifications
   - Set sender email and name
   - Set reply-to email

2. **Event Reminders**
   - Toggle 1-day reminder
   - Toggle 1-hour reminder

3. **Fee Reminders**
   - Toggle fee assignment notification
   - Toggle 3-day reminder

4. **Certificate Notifications**
   - Toggle certificate ready notification

### Notification Logs

View all sent notifications at **Dashboard → Notifications → Logs**:

- Filter by type and status
- Search by recipient or subject
- Retry failed notifications
- View error messages

## Triggering Notifications

### Automatic Triggers

Notifications are automatically triggered by:

1. **Event Reminders**: Scheduler runs and checks for upcoming events
2. **Fee 3-Day Reminder**: Scheduler runs and checks for fees due in 3 days
3. **Fee Assignment**: When you manually assign a fee (requires integration)
4. **Certificate Ready**: When you mark a certificate as ready (requires integration)

### Manual Integration

To trigger notifications programmatically from your code:

```typescript
import { sendEventReminder, sendFeeReminder, sendCertificateNotification } from '@/lib/email-service'

// Event reminder
await sendEventReminder(
  'student@example.com',
  'John Doe',
  'Orientation Day',
  'December 25, 2024',
  '9:00 AM - 12:00 PM',
  'Main Auditorium',
  '1day'
)

// Fee reminder
await sendFeeReminder(
  'student@example.com',
  'John Doe',
  'Tuition Fee',
  5000,
  'December 31, 2024',
  'assigned'
)

// Certificate notification
await sendCertificateNotification(
  'student@example.com',
  'John Doe',
  'Certificate of Completion',
  'https://your-domain.com/certificates/download/123'
)
```

## Email Templates

Email templates are responsive and include:

- School branding (SmartU logo and colors)
- Personalized student information
- Event/fee/certificate details
- Consistent styling across all emails

Templates can be customized in `src/lib/email-service.ts`.

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials in `.env`
2. Verify email configuration in admin settings
3. Check notification logs for error messages
4. Test email connection using the test email feature

### Development Mode

In development, the system uses Ethereal Email (fake SMTP service):

- Emails won't actually be sent
- Preview URLs are printed to the console
- Use these URLs to view the emails

### Common Errors

**"Authentication failed"**
- Check SMTP username and password
- For Gmail, use an App Password, not your regular password

**"Connection refused"**
- Check SMTP host and port
- Verify firewall settings

**"Invalid sender"**
- Ensure sender email matches your SMTP account
- Some providers require sender email to match authenticated user

## Scheduler Status

Monitor scheduler performance:

- Check notification logs for sent/failed messages
- View scheduler results in API response
- Set up monitoring alerts for failed notifications

## Security

- Keep `CRON_SECRET` secure
- Use app passwords instead of regular passwords
- Enable 2FA on your email account
- Regularly rotate SMTP credentials
- Monitor notification logs for suspicious activity

## Support

For issues or questions:
- Check notification logs for error details
- Review SMTP provider documentation
- Test with different email addresses
- Contact system administrator

---

**Note:** Make sure to configure SMTP settings in production before enabling notifications. Test thoroughly with small groups before rolling out to all students.

