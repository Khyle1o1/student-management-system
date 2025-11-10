-- Migration: Add event_id and student_id to form_responses table
-- This allows us to link form responses to specific events and students

-- Add event_id column
ALTER TABLE form_responses
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Add student_id column (references the students table, not users)
ALTER TABLE form_responses
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_form_responses_event_id ON form_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_student_id ON form_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_event ON form_responses(form_id, event_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_student ON form_responses(form_id, student_id);

-- Add comment
COMMENT ON COLUMN form_responses.event_id IS 'Links form response to a specific event (for event evaluations)';
COMMENT ON COLUMN form_responses.student_id IS 'Links form response to a specific student (for event evaluations)';

