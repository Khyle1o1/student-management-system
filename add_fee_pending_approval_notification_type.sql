-- Add fee_pending_approval notification type to notification_logs table
-- This migration adds support for admin email notifications when fees are submitted for approval

-- Drop the existing constraint
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check;

-- Add the new constraint with the additional notification type
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_notification_type_check 
  CHECK (notification_type IN ('event_1day', 'event_1hour', 'fee_assigned', 'fee_3days', 'certificate', 'fee_pending_approval'));

-- Add comment to explain the new type
COMMENT ON COLUMN notification_logs.notification_type IS 
  'Type of notification: event_1day (1 day before event), event_1hour (1 hour before event), fee_assigned (when fee is assigned to student), fee_3days (3 days before fee due date), certificate (certificate ready), fee_pending_approval (fee submitted by org pending admin approval)';

-- IMPORTANT: Insert default notification settings if not exists
-- This enables the notification system to work properly
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
  true,
  true,
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM notification_settings LIMIT 1);


