-- QUICK FIX: Insert default notification settings
-- Run this immediately to enable email notifications

-- Check if notification_settings table exists and is empty
DO $$
BEGIN
  -- Insert default settings if table is empty
  IF NOT EXISTS (SELECT 1 FROM notification_settings LIMIT 1) THEN
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
      true,                        -- enabled
      'noreply@smartu.edu',       -- sender_email
      'SmartU',                   -- sender_name
      'support@smartu.edu',       -- reply_to
      true,                       -- event_reminder_1_day
      true,                       -- event_reminder_1_hour
      true,                       -- fee_reminder_on_assignment
      true,                       -- fee_reminder_3_days
      true                        -- certificate_notification
    );
    
    RAISE NOTICE 'Default notification settings created successfully!';
  ELSE
    RAISE NOTICE 'Notification settings already exist. No changes made.';
  END IF;
END $$;

-- Verify the settings were created
SELECT 
  enabled,
  sender_email,
  sender_name,
  fee_reminder_on_assignment,
  created_at
FROM notification_settings;

