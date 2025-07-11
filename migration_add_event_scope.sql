-- Migration: Add scope fields to events table
-- This migration adds scope functionality to existing events

-- Add scope fields to events table
ALTER TABLE events 
ADD COLUMN scope_type TEXT NOT NULL DEFAULT 'UNIVERSITY_WIDE' CHECK (scope_type IN ('UNIVERSITY_WIDE', 'COLLEGE_WIDE', 'COURSE_SPECIFIC')),
ADD COLUMN scope_college TEXT,
ADD COLUMN scope_course TEXT;

-- Update all existing events to have UNIVERSITY_WIDE scope by default
UPDATE events 
SET scope_type = 'UNIVERSITY_WIDE' 
WHERE scope_type IS NULL;

-- Add comment to explain the scope fields
COMMENT ON COLUMN events.scope_type IS 'Defines who can attend the event: UNIVERSITY_WIDE, COLLEGE_WIDE, or COURSE_SPECIFIC';
COMMENT ON COLUMN events.scope_college IS 'Required when scope_type is COLLEGE_WIDE or COURSE_SPECIFIC - specifies the college';
COMMENT ON COLUMN events.scope_course IS 'Required when scope_type is COURSE_SPECIFIC - specifies the course';

-- Add index for better performance on scope filtering
CREATE INDEX idx_events_scope_type ON events(scope_type);
CREATE INDEX idx_events_scope_college ON events(scope_college) WHERE scope_college IS NOT NULL;
CREATE INDEX idx_events_scope_course ON events(scope_course) WHERE scope_course IS NOT NULL; 