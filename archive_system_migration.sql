-- Migration: Add Archive System to Students
-- This migration adds fields to support archiving students and automatic deletion after 2 years

-- Add archived fields to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for archived field for better query performance
CREATE INDEX IF NOT EXISTS idx_students_archived ON students(archived);

-- Create index for archived_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_students_archived_at ON students(archived_at);

-- Create a function to automatically delete archived students after 2 years
CREATE OR REPLACE FUNCTION delete_old_archived_students()
RETURNS void AS $$
BEGIN
    -- Delete students archived more than 2 years ago
    -- CASCADE will handle related records (attendance, payments, etc.)
    DELETE FROM students
    WHERE archived = TRUE 
    AND archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job comment (actual scheduling would be done via pg_cron or external scheduler)
-- COMMENT: Schedule this function to run daily:
-- SELECT cron.schedule('delete-old-archived-students', '0 2 * * *', 'SELECT delete_old_archived_students();');

-- For immediate use, you can also create a trigger-based approach
-- Or run this function periodically via your application or cron job

