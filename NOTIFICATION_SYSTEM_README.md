# Email Notification System

A comprehensive automated email reminder system for the SmartU Student Management System.

## Features

### 📧 Automatic Email Reminders

1. **Event Reminders**
   - 1 day before event starts
   - 1 hour before event starts
   - Sent to all registered students

2. **Fee Reminders**
   - When a new fee is assigned to a student
   - 3 days before the due date (for unpaid fees)

3. **Certificate Notifications**
   - When a student's certificate is ready for download

### 🎨 Beautiful Email Templates

- Responsive HTML design
- Navy blue theme matching SmartU branding
- Personalized with student name and details
- Professional layout with logo and consistent styling

### ⚙️ Admin Control Panel

**Notification Settings** (`/dashboard/notifications/settings`)
- Enable/disable entire notification system
- Toggle individual notification types
- Configure sender email and reply-to
- Send test emails to verify configuration

**Notification Logs** (`/dashboard/notifications/logs`)
- View all sent notifications
- Filter by type and status
- Search by recipient or subject
- Retry failed notifications
- View detailed error messages

### 🔄 Automated Scheduler

- Runs automatically via cron jobs
- Checks for upcoming events and due fees
- Sends reminders at appropriate times
- Logs all activities for auditing

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

Dependencies added:
- `nodemailer` - Email sending
- `@types/nodemailer` - TypeScript types
- `date-fns` - Date formatting (already included)

### 2. Configure Environment

Add to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@smartu.edu
SMTP_FROM_NAME=SmartU

# Cron Secret
CRON_SECRET=your-random-secret-key
```

### 3. Run Database Migration

Execute `sql/notification_system.sql` in your Supabase SQL editor to create:
- `notification_settings` table
- `notification_logs` table
- `scheduled_reminders` table
- Required indexes and triggers

### 4. Set Up Cron Job

Choose one option:

**Option A: Vercel Cron (Recommended)**

Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/notifications/run-scheduler",
    "schedule": "0 * * * *"
  }]
}
```

**Option B: External Cron Service**

Point your cron service to:
```
POST https://your-domain.com/api/notifications/run-scheduler
Header: Authorization: Bearer your-secret-token
```

**Option C: Manual Testing**

Visit: `https://your-domain.com/api/notifications/run-scheduler`

### 5. Configure Settings

1. Log in as admin
2. Navigate to **Dashboard → Notifications → Settings**
3. Configure email settings
4. Test with your email address
5. Enable desired notification types

## File Structure

```
src/
├── lib/
│   ├── email-service.ts          # Email sending and templates
│   ├── reminder-scheduler.ts     # Scheduler logic
│   └── notification-helpers.ts   # Helper functions for integration
├── app/
│   ├── api/notifications/
│   │   ├── settings/route.ts     # Settings API
│   │   ├── logs/route.ts         # Logs API
│   │   ├── retry/[id]/route.ts   # Retry failed notification
│   │   ├── send-test/route.ts    # Test email sending
│   │   └── run-scheduler/route.ts # Scheduler endpoint
│   └── dashboard/notifications/
│       ├── settings/page.tsx     # Admin settings UI
│       ├── logs/page.tsx         # Admin logs UI
│       └── layout.tsx            # Notifications layout
sql/
└── notification_system.sql       # Database schema

Documentation:
├── EMAIL_REMINDERS_SETUP.md      # Detailed setup guide
└── NOTIFICATION_SYSTEM_README.md # This file
```

## API Reference

### Endpoints

#### `GET/PUT /api/notifications/settings`
Get or update notification settings

#### `GET /api/notifications/logs`
Get notification logs with pagination and filtering
- Query params: `page`, `limit`, `type`, `status`, `search`

#### `POST /api/notifications/retry/:id`
Retry a failed notification

#### `POST /api/notifications/send-test`
Send a test email
- Body: `{ type: 'event' | 'fee' | 'certificate', email: string }`

#### `POST /api/notifications/run-scheduler`
Run the scheduler (cron job endpoint)
- Requires `Authorization: Bearer {CRON_SECRET}` header

### Helper Functions

```typescript
import { notifyFeeAssigned, notifyCertificateReady } from '@/lib/notification-helpers'

// Notify when fee is assigned
await notifyFeeAssigned(
  studentId,
  feeId,
  'Tuition Fee',
  5000,
  '2024-12-31'
)

// Notify when certificate is ready
await notifyCertificateReady(
  studentId,
  certificateId,
  'Certificate of Completion',
  'https://your-domain.com/certificates/download/123'
)

// Batch notify multiple students
await notifyBatchFeeAssigned(
  ['student-1', 'student-2'],
  feeId,
  'Tuition Fee',
  5000,
  '2024-12-31'
)
```

## Email Templates

### Event Reminder

Includes:
- Student name
- Event name, date, time
- Location
- Countdown (1 day or 1 hour)

### Fee Reminder

Includes:
- Student name
- Fee title and amount
- Due date
- Warning for overdue fees

### Certificate Notification

Includes:
- Student name
- Certificate name
- Download button/link
- Congratulatory message

## Customization

### Modify Email Templates

Edit templates in `src/lib/email-service.ts`:

```typescript
function generateEventReminderTemplate(
  studentName: string,
  eventName: string,
  eventDate: string,
  eventTime: string,
  location: string,
  timeText: string
): string {
  // Modify HTML here
}
```

### Change Branding

Update in email templates:
- Colors: Change `#191970` (navy blue) to your brand color
- Logo: Update the header section
- Footer text: Modify footer content

### Adjust Reminder Timing

Edit `src/lib/reminder-scheduler.ts`:

```typescript
// Change from 1 day to 2 days
tomorrow.setHours(tomorrow.getHours() + 48) // instead of 24

// Change from 3 days to 5 days
threeDaysLater.setDate(threeDaysLater.getDate() + 5) // instead of 3
```

## Monitoring

### View Sent Notifications

Navigate to **Dashboard → Notifications → Logs** to see:
- All sent emails
- Delivery status
- Error messages
- Timestamp

### Retry Failed Notifications

1. Go to Notification Logs
2. Find failed notifications
3. Click "Retry" button
4. Check if successfully sent

### Monitor Scheduler

The scheduler API returns:
```json
{
  "success": true,
  "results": {
    "processed": 10,
    "sent": 8,
    "failed": 2
  }
}
```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials**
   - Verify `.env` variables
   - Test with test email feature

2. **Check notification settings**
   - Ensure notifications are enabled
   - Check specific reminder types

3. **View logs**
   - Check Notification Logs page
   - Look for error messages

### Common Errors

**"Invalid login"**
- Gmail: Use App Password, not account password
- Enable 2FA and generate app password

**"Connection timeout"**
- Check SMTP host and port
- Verify firewall settings

**"Sender rejected"**
- Ensure sender email matches SMTP account
- Some providers require verified domains

### Development Mode

In development without SMTP configured:
- Uses Ethereal Email (fake SMTP)
- Preview URLs logged to console
- No actual emails sent

## Security

### Best Practices

1. **Use App Passwords**
   - Never use your main email password
   - Generate app-specific passwords

2. **Secure CRON_SECRET**
   - Use strong random token
   - Keep it secret
   - Rotate periodically

3. **Monitor Logs**
   - Regularly check for suspicious activity
   - Review failed notifications
   - Set up alerts for high failure rates

4. **Limit Access**
   - Only admins can access notification settings
   - Logs are admin-only
   - API endpoints are protected

## Performance

### Optimization Tips

1. **Batch Processing**
   - Scheduler processes in batches
   - Prevents overwhelming SMTP server

2. **Rate Limiting**
   - Add delays between emails if needed
   - Check SMTP provider limits

3. **Queue System** (Future Enhancement)
   - Consider adding a job queue
   - Use Bull or BullMQ for large scale

### Scaling

For large numbers of students:
- Use professional email service (SendGrid, AWS SES)
- Implement job queue system
- Add retry logic with exponential backoff
- Monitor email delivery rates

## Testing

### Manual Testing

1. Configure test SMTP credentials
2. Go to Notification Settings
3. Enter your email
4. Click test buttons
5. Verify email receipt and formatting

### Integration Testing

```typescript
// Test fee notification
const result = await notifyFeeAssigned(
  testStudentId,
  testFeeId,
  'Test Fee',
  100,
  '2024-12-31'
)
console.log('Notification sent:', result)
```

## Future Enhancements

Potential improvements:
- [ ] SMS notifications
- [ ] Push notifications
- [ ] Custom email templates per organization
- [ ] Notification preferences per student
- [ ] Digest emails (daily/weekly summaries)
- [ ] Email analytics and open rates
- [ ] A/B testing for email templates
- [ ] Multi-language support
- [ ] Rich text editor for templates
- [ ] Webhook integrations

## Support

For help:
- Check `EMAIL_REMINDERS_SETUP.md` for detailed setup
- Review notification logs for errors
- Test with different email addresses
- Contact system administrator

## License

Part of the SmartU Student Management System.

---

**Built with ❤️ for SmartU - Smart Solutions for a Smarter BukSU**

