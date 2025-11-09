-- Migration: Add attendance_type column to events table
-- This migration adds attendance tracking configuration to events

DO $$ 
BEGIN
    -- Add attendance_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'attendance_type') THEN
        ALTER TABLE events ADD COLUMN attendance_type TEXT NOT NULL DEFAULT 'IN_ONLY' CHECK (attendance_type IN ('IN_ONLY', 'IN_OUT'));
        
        -- Add comment to explain the field
        COMMENT ON COLUMN events.attendance_type IS 'Defines how attendance is tracked: IN_ONLY (check-in only) or IN_OUT (requires both check-in and check-out)';
        
        -- Add index for better performance
        CREATE INDEX IF NOT EXISTS idx_events_attendance_type ON events(attendance_type);
        
        RAISE NOTICE 'Successfully added attendance_type column to events table';
    ELSE
        RAISE NOTICE 'attendance_type column already exists in events table';
    END IF;
END $$;

-- Update existing events to have IN_ONLY as default if null
UPDATE events 
SET attendance_type = 'IN_ONLY' 
WHERE attendance_type IS NULL;

