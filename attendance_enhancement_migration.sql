-- Enhanced Attendance Schema Migration
-- Adds support for Sign In/Sign Out functionality with timestamps

DO $$ 
BEGIN
    -- Add time_in column if it doesn't exist (for sign-in timestamp)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'time_in') THEN
        ALTER TABLE attendance ADD COLUMN time_in TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add time_out column if it doesn't exist (for sign-out timestamp)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'time_out') THEN
        ALTER TABLE attendance ADD COLUMN time_out TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add mode column to track whether it's a sign-in or sign-out entry
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'mode') THEN
        ALTER TABLE attendance ADD COLUMN mode VARCHAR(20) CHECK (mode IN ('SIGN_IN', 'SIGN_OUT'));
    END IF;

    -- Update existing records to have time_in = created_at and status = 'SIGN_IN'
    UPDATE attendance 
    SET time_in = created_at, mode = 'SIGN_IN'
    WHERE time_in IS NULL;
END $$;

-- Add indexes for better performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_time_in') THEN
        CREATE INDEX idx_attendance_time_in ON attendance(time_in);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_mode') THEN
        CREATE INDEX idx_attendance_mode ON attendance(mode);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN attendance.time_in IS 'Timestamp when student signed in';
COMMENT ON COLUMN attendance.time_out IS 'Timestamp when student signed out (null if not signed out)';
COMMENT ON COLUMN attendance.mode IS 'Whether this record represents a sign-in or sign-out action'; 