-- DEBUG: Check notification_settings table status

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'notification_settings'
) AS table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_settings'
ORDER BY ordinal_position;

-- 3. Check row count
SELECT COUNT(*) as row_count FROM notification_settings;

-- 4. Check all data in table
SELECT * FROM notification_settings;

-- 5. Try to insert with error handling
DO $$
BEGIN
  -- Delete any existing rows first
  DELETE FROM notification_settings;
  
  -- Insert fresh settings
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
  
  RAISE NOTICE '✓ Successfully inserted notification settings!';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✗ Error: %', SQLERRM;
END $$;

-- 6. Verify the insert worked
SELECT 
  id,
  enabled,
  sender_email,
  sender_name,
  fee_reminder_on_assignment,
  created_at
FROM notification_settings;

