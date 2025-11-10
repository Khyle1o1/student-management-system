-- ============================================
-- ADD evaluation_id TO events TABLE
-- Date: 2025-11-09
-- Purpose: Link events to evaluation forms (new system)
-- ============================================

BEGIN;

-- Add evaluation_id column to events table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'evaluation_id'
    ) THEN
        ALTER TABLE events 
        ADD COLUMN evaluation_id UUID REFERENCES evaluation_forms(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN events.evaluation_id IS 'Links to evaluation form in new forms system';
        
        -- Create index for better performance
        CREATE INDEX idx_events_evaluation_id ON events(evaluation_id);
        
        RAISE NOTICE 'Added evaluation_id column to events table';
    ELSE
        RAISE NOTICE 'evaluation_id column already exists in events table';
    END IF;
END $$;

-- Migrate data from old event_evaluations table (if it still exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'event_evaluations'
    ) THEN
        -- Update events with evaluation_id from old event_evaluations table
        UPDATE events e
        SET evaluation_id = ee.evaluation_id
        FROM event_evaluations ee
        WHERE e.id = ee.event_id
        AND e.evaluation_id IS NULL;
        
        RAISE NOTICE 'Migrated evaluation_id from event_evaluations table';
    ELSE
        RAISE NOTICE 'event_evaluations table does not exist (already dropped)';
    END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that the column exists:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'events' 
-- AND column_name = 'evaluation_id';

-- Check how many events have evaluations:
-- SELECT 
--   COUNT(*) as total_events,
--   COUNT(evaluation_id) as events_with_evaluation
-- FROM events;

