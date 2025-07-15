-- In-App Notification System Migration
-- Replaces email notifications with in-app notifications

DO $$ 
BEGIN
    -- Create notifications table for in-app messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            student_id UUID REFERENCES students(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL, -- 'ATTENDANCE_CONFIRMED', 'EVALUATION_REQUIRED', 'CERTIFICATE_READY'
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data JSONB, -- Additional data (event_id, certificate_id, etc.)
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration for notifications
        );
    END IF;
END $$;

-- Create indexes for better performance
DO $$
BEGIN
    -- Notifications indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_student_id') THEN
        CREATE INDEX idx_notifications_student_id ON notifications(student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_type') THEN
        CREATE INDEX idx_notifications_type ON notifications(type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_created_at') THEN
        CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_is_read') THEN
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Store in-app notifications for users and students';
COMMENT ON COLUMN notifications.type IS 'Type of notification: ATTENDANCE_CONFIRMED, EVALUATION_REQUIRED, CERTIFICATE_READY';
COMMENT ON COLUMN notifications.data IS 'JSON data with additional notification context (event_id, certificate_id, etc.)';
COMMENT ON COLUMN notifications.expires_at IS 'Optional expiration timestamp for temporary notifications'; 