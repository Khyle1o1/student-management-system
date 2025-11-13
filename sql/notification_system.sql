-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  sender_email VARCHAR(255) DEFAULT 'noreply@smartu.edu',
  sender_name VARCHAR(255) DEFAULT 'SmartU',
  reply_to VARCHAR(255) DEFAULT 'support@smartu.edu',
  
  -- Event reminder settings
  event_reminder_1_day BOOLEAN DEFAULT true,
  event_reminder_1_hour BOOLEAN DEFAULT true,
  
  -- Fee reminder settings
  fee_reminder_on_assignment BOOLEAN DEFAULT true,
  fee_reminder_3_days BOOLEAN DEFAULT true,
  
  -- Certificate notification settings
  certificate_notification BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('event_1day', 'event_1hour', 'fee_assigned', 'fee_3days', 'certificate')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  message_id VARCHAR(255),
  error_message TEXT,
  
  -- Related entity IDs
  event_id UUID,
  fee_id UUID,
  certificate_id UUID,
  student_id UUID,
  
  -- Email content (for retry purposes)
  email_html TEXT,
  email_text TEXT,
  
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys (if tables exist)
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_student ON notification_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event ON notification_logs(event_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_logs_updated_at
  BEFORE UPDATE ON notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings if not exists
INSERT INTO notification_settings (id, enabled, sender_email, sender_name, reply_to)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  true,
  'noreply@smartu.edu',
  'SmartU',
  'support@smartu.edu'
WHERE NOT EXISTS (SELECT 1 FROM notification_settings LIMIT 1);

-- Create table for scheduled reminders (to track what reminders need to be sent)
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('event_1day', 'event_1hour', 'fee_3days')),
  entity_id UUID NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('event', 'fee')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  student_id UUID NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  
  -- Ensure we don't schedule duplicate reminders
  UNIQUE (reminder_type, entity_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_for ON scheduled_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON scheduled_reminders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_type ON scheduled_reminders(reminder_type);

