-- Complete Attendance System Fix Migration
-- This migration adds all missing columns and tables needed for the attendance system

-- 1. Fix Events table - add missing time columns
DO $$ 
BEGIN
    -- Add start_time if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_time') THEN
        ALTER TABLE events ADD COLUMN start_time TIME DEFAULT '09:00';
    END IF;

    -- Add end_time if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'end_time') THEN
        ALTER TABLE events ADD COLUMN end_time TIME DEFAULT '17:00';
    END IF;

    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'type') THEN
        ALTER TABLE events ADD COLUMN type VARCHAR(100) DEFAULT 'GENERAL';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE events ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';
    END IF;
END $$;

-- 2. Fix Attendance table - add missing columns
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

    -- Add certificate_generated field to attendance table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'certificate_generated') THEN
        ALTER TABLE attendance ADD COLUMN certificate_generated BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Create certificate_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    background_design JSONB,
    dynamic_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create event_certificate_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, certificate_template_id)
);

-- 5. Create certificates table if it doesn't exist
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE,
    file_path VARCHAR(500),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Update existing records to have proper defaults
UPDATE events 
SET start_time = '09:00' 
WHERE start_time IS NULL;

UPDATE events 
SET end_time = '17:00' 
WHERE end_time IS NULL;

UPDATE events 
SET type = 'GENERAL' 
WHERE type IS NULL;

UPDATE events 
SET status = 'ACTIVE' 
WHERE status IS NULL;

UPDATE attendance 
SET time_in = created_at, mode = 'SIGN_IN'
WHERE time_in IS NULL;

-- 7. Add indexes for better performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_start_time') THEN
        CREATE INDEX idx_events_start_time ON events(start_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_end_time') THEN
        CREATE INDEX idx_events_end_time ON events(end_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_time_in') THEN
        CREATE INDEX idx_attendance_time_in ON attendance(time_in);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_mode') THEN
        CREATE INDEX idx_attendance_mode ON attendance(mode);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_certificates_student_event') THEN
        CREATE INDEX idx_certificates_student_event ON certificates(student_id, event_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_certificates_number') THEN
        CREATE INDEX idx_certificates_number ON certificates(certificate_number);
    END IF;
END $$;

-- 8. Add comments for documentation
COMMENT ON COLUMN events.start_time IS 'Event start time';
COMMENT ON COLUMN events.end_time IS 'Event end time';
COMMENT ON COLUMN events.type IS 'Type of event (e.g., SEMINAR, WORKSHOP, LECTURE)';
COMMENT ON COLUMN events.status IS 'Event status (ACTIVE, CANCELLED, COMPLETED)';
COMMENT ON COLUMN attendance.time_in IS 'Timestamp when student signed in';
COMMENT ON COLUMN attendance.time_out IS 'Timestamp when student signed out (null if not signed out)';
COMMENT ON COLUMN attendance.mode IS 'Whether this record represents a sign-in or sign-out action';
COMMENT ON COLUMN attendance.certificate_generated IS 'Whether certificate has been generated for this attendance record';

-- 9. Create a function to generate certificate numbers
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS VARCHAR(100) AS $$
DECLARE
    cert_number VARCHAR(100);
    counter INTEGER := 1;
BEGIN
    LOOP
        cert_number := 'CERT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if this number already exists
        IF NOT EXISTS (SELECT 1 FROM certificates WHERE certificate_number = cert_number) THEN
            RETURN cert_number;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10. Create a trigger to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to relevant tables
DO $$
BEGIN
    -- Events table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
        CREATE TRIGGER update_events_updated_at
            BEFORE UPDATE ON events
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Attendance table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_updated_at') THEN
        CREATE TRIGGER update_attendance_updated_at
            BEFORE UPDATE ON attendance
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Certificates table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_certificates_updated_at') THEN
        CREATE TRIGGER update_certificates_updated_at
            BEFORE UPDATE ON certificates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
