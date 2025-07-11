-- Quick fix: Add missing location column to events table
-- Run this in your database

-- Add location column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location') THEN
        ALTER TABLE events ADD COLUMN location TEXT;
        -- Set default value for existing events
        UPDATE events SET location = 'TBD' WHERE location IS NULL;
    END IF;
END $$;

-- Verify the column was added
SELECT column_name FROM information_schema.columns WHERE table_name = 'events' ORDER BY column_name; 