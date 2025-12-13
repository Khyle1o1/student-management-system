-- Fix duplicate rows in notification_settings table
-- Run this to clean up and keep only one row

-- Step 1: Check how many rows exist
SELECT COUNT(*) as row_count FROM notification_settings;

-- Step 2: See all rows
SELECT * FROM notification_settings ORDER BY created_at;

-- Step 3: Delete all rows
DELETE FROM notification_settings;

-- Step 4: Insert ONE clean row
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
) VALUES (
  true,
  'noreply@smartu.edu',
  'SmartU',
  'support@smartu.edu',
  true,
  true,
  true,
  true,
  true
);

-- Step 5: Verify only 1 row exists
SELECT COUNT(*) as row_count FROM notification_settings;

-- Step 6: View the clean row
SELECT 
  id,
  enabled,
  sender_email,
  fee_reminder_on_assignment,
  created_at
FROM notification_settings;

