-- Add event_pending_approval notification type to notification_logs table
-- This migration adds support for admin email notifications when events are submitted for approval

-- Drop the existing constraint
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check;

-- Add the new constraint with the additional notification type
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

-- Add comment to explain the new type
COMMENT ON COLUMN notification_logs.notification_type IS 
  'Type of notification: event_1day (1 day before event), event_1hour (1 hour before event), fee_assigned (when fee is assigned to student), fee_3days (3 days before fee due date), certificate (certificate ready), fee_pending_approval (fee submitted by org pending admin approval), event_pending_approval (event submitted by org pending admin approval)';

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'notification_logs_notification_type_check';

