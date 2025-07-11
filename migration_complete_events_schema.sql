-- Complete events table schema migration
DO $$ 
BEGIN
    -- Add description if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'description') THEN
        ALTER TABLE events ADD COLUMN description TEXT;
    END IF;

    -- Add type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'type') THEN
        ALTER TABLE events ADD COLUMN type TEXT DEFAULT 'ACADEMIC';
    END IF;

    -- Add max_capacity if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'max_capacity') THEN
        ALTER TABLE events ADD COLUMN max_capacity INTEGER DEFAULT 100;
    END IF;

    -- Add start_time if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_time') THEN
        ALTER TABLE events ADD COLUMN start_time TIME DEFAULT '09:00';
    END IF;

    -- Add end_time if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'end_time') THEN
        ALTER TABLE events ADD COLUMN end_time TIME DEFAULT '17:00';
    END IF;

    -- Add scope_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'scope_type') THEN
        ALTER TABLE events ADD COLUMN scope_type TEXT DEFAULT 'UNIVERSITY_WIDE';
    END IF;

    -- Add scope_college if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'scope_college') THEN
        ALTER TABLE events ADD COLUMN scope_college TEXT;
    END IF;

    -- Add scope_course if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'scope_course') THEN
        ALTER TABLE events ADD COLUMN scope_course TEXT;
    END IF;

    -- Update existing NULL values with defaults
    UPDATE events SET 
        type = 'ACADEMIC' WHERE type IS NULL,
        max_capacity = 100 WHERE max_capacity IS NULL,
        start_time = '09:00' WHERE start_time IS NULL,
        end_time = '17:00' WHERE end_time IS NULL,
        scope_type = 'UNIVERSITY_WIDE' WHERE scope_type IS NULL;
END $$;

-- Add indexes for better performance
DO $$
BEGIN
    -- Create index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_type') THEN
        CREATE INDEX idx_events_type ON events(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_scope_type') THEN
        CREATE INDEX idx_events_scope_type ON events(scope_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_scope_college') THEN
        CREATE INDEX idx_events_scope_college ON events(scope_college) WHERE scope_college IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_scope_course') THEN
        CREATE INDEX idx_events_scope_course ON events(scope_course) WHERE scope_course IS NOT NULL;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN events.start_time IS 'Event start time';
COMMENT ON COLUMN events.end_time IS 'Event end time';
COMMENT ON COLUMN events.type IS 'Event type: ACADEMIC, EXTRACURRICULAR, MEETING, SEMINAR, WORKSHOP, OTHER';
COMMENT ON COLUMN events.max_capacity IS 'Maximum number of attendees (optional)';
COMMENT ON COLUMN events.scope_type IS 'Defines who can attend the event: UNIVERSITY_WIDE, COLLEGE_WIDE, or COURSE_SPECIFIC';
COMMENT ON COLUMN events.scope_college IS 'Required when scope_type is COLLEGE_WIDE or COURSE_SPECIFIC - specifies the college';
COMMENT ON COLUMN events.scope_course IS 'Required when scope_type is COURSE_SPECIFIC - specifies the course'; 