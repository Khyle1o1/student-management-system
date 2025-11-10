-- ============================================
-- MIGRATION: Remove Old Evaluations System
-- Date: 2025-11-09
-- Purpose: Drop old evaluations tables and replace with new forms system
-- ============================================

-- WARNING: This will permanently delete all old evaluation data!
-- Make sure you have backed up your data before running this migration.

BEGIN;

-- Drop old tables in reverse order of dependencies
DROP TABLE IF EXISTS evaluation_responses CASCADE;
DROP TABLE IF EXISTS event_evaluations CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;

-- Note: We are keeping evaluation_forms as it is the new system
-- Note: We are keeping form_responses as it is the new system

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (run these to verify)
-- ============================================

-- Check that old tables are gone:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('evaluations', 'evaluation_responses', 'event_evaluations');
-- (Should return no rows)

-- Check that new tables still exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('evaluation_forms', 'form_responses');
-- (Should return 2 rows)

