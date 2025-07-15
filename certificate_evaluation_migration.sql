-- Certificate and Evaluation System Migration
-- Adds support for event evaluations and certificate generation

DO $$ 
BEGIN
    -- Create evaluations table for evaluation templates
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluations') THEN
        CREATE TABLE evaluations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            questions JSONB NOT NULL, -- Store questions as JSON
            is_template BOOLEAN DEFAULT true,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- Create event_evaluations table to link events with evaluations
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_evaluations') THEN
        CREATE TABLE event_evaluations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
            is_required BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id) -- One evaluation per event
        );
    END IF;

    -- Create student_evaluation_responses table for student submissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_evaluation_responses') THEN
        CREATE TABLE student_evaluation_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            student_id UUID REFERENCES students(id) ON DELETE CASCADE,
            evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
            responses JSONB NOT NULL, -- Store responses as JSON
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, student_id) -- One response per student per event
        );
    END IF;

    -- Create certificates table for certificate metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificates') THEN
        CREATE TABLE certificates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            student_id UUID REFERENCES students(id) ON DELETE CASCADE,
            certificate_type VARCHAR(100) DEFAULT 'PARTICIPATION',
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            is_accessible BOOLEAN DEFAULT false, -- Only accessible after evaluation completion
            file_path TEXT, -- Path to generated PDF
            certificate_number VARCHAR(100) UNIQUE, -- Unique certificate identifier
            UNIQUE(event_id, student_id) -- One certificate per student per event
        );
    END IF;

    -- Create certificate_access_log table to track downloads/views
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificate_access_log') THEN
        CREATE TABLE certificate_access_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE,
            student_id UUID REFERENCES students(id),
            access_type VARCHAR(50) NOT NULL, -- 'VIEW' or 'DOWNLOAD'
            accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ip_address INET,
            user_agent TEXT
        );
    END IF;

    -- Add require_evaluation field to events table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'require_evaluation') THEN
        ALTER TABLE events ADD COLUMN require_evaluation BOOLEAN DEFAULT false;
    END IF;

    -- Add certificate_generated field to attendance table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'certificate_generated') THEN
        ALTER TABLE attendance ADD COLUMN certificate_generated BOOLEAN DEFAULT false;
    END IF;

    -- Add evaluation_completed field to attendance table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'evaluation_completed') THEN
        ALTER TABLE attendance ADD COLUMN evaluation_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create indexes for better performance
DO $$
BEGIN
    -- Evaluations indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_evaluations_created_by') THEN
        CREATE INDEX idx_evaluations_created_by ON evaluations(created_by);
    END IF;

    -- Event evaluations indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_event_evaluations_event_id') THEN
        CREATE INDEX idx_event_evaluations_event_id ON event_evaluations(event_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_event_evaluations_evaluation_id') THEN
        CREATE INDEX idx_event_evaluations_evaluation_id ON event_evaluations(evaluation_id);
    END IF;

    -- Student evaluation responses indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_evaluation_responses_event_student') THEN
        CREATE INDEX idx_student_evaluation_responses_event_student ON student_evaluation_responses(event_id, student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_evaluation_responses_student_id') THEN
        CREATE INDEX idx_student_evaluation_responses_student_id ON student_evaluation_responses(student_id);
    END IF;

    -- Certificates indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_certificates_event_student') THEN
        CREATE INDEX idx_certificates_event_student ON certificates(event_id, student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_certificates_student_id') THEN
        CREATE INDEX idx_certificates_student_id ON certificates(student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_certificates_certificate_number') THEN
        CREATE INDEX idx_certificates_certificate_number ON certificates(certificate_number);
    END IF;

    -- Certificate access log indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_certificate_access_log_certificate_id') THEN
        CREATE INDEX idx_certificate_access_log_certificate_id ON certificate_access_log(certificate_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_certificate_access_log_student_id') THEN
        CREATE INDEX idx_certificate_access_log_student_id ON certificate_access_log(student_id);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE evaluations IS 'Store evaluation templates and forms';
COMMENT ON TABLE event_evaluations IS 'Link events to evaluations and define requirements';
COMMENT ON TABLE student_evaluation_responses IS 'Store student responses to event evaluations';
COMMENT ON TABLE certificates IS 'Store certificate metadata and accessibility status';
COMMENT ON TABLE certificate_access_log IS 'Track certificate downloads and views';

COMMENT ON COLUMN evaluations.questions IS 'JSON array of evaluation questions with types and options';
COMMENT ON COLUMN student_evaluation_responses.responses IS 'JSON object of student answers keyed by question IDs';
COMMENT ON COLUMN certificates.is_accessible IS 'Whether certificate can be viewed/downloaded by student';
COMMENT ON COLUMN certificates.certificate_number IS 'Unique identifier for the certificate';
COMMENT ON COLUMN events.require_evaluation IS 'Whether students must complete evaluation to access certificate';
COMMENT ON COLUMN attendance.certificate_generated IS 'Whether certificate has been generated for this attendance record';
COMMENT ON COLUMN attendance.evaluation_completed IS 'Whether student has completed the required evaluation'; 