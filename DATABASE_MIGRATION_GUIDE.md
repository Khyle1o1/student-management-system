# Database Migration Guide - Event Scope Feature

## Overview
This migration adds event scope functionality to allow University-wide, College-wide, and Course-specific events.

## Migration Steps

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `migration_add_event_scope.sql`
4. Run the SQL commands

### Option 2: Using Supabase CLI
```bash
supabase db reset --db-url "your-database-url"
# or apply the specific migration
npx supabase migration new add_event_scope
# Copy the SQL from migration_add_event_scope.sql to the new migration file
npx supabase db push
```

### Option 3: Manual SQL Execution
If you have access to your PostgreSQL database directly:
```bash
psql "your-database-url" -f migration_add_event_scope.sql
```

## What the Migration Does

1. **Adds three new columns to the events table:**
   - `scope_type`: Defines who can attend (UNIVERSITY_WIDE, COLLEGE_WIDE, COURSE_SPECIFIC)
   - `scope_college`: Specifies college for college-wide and course-specific events
   - `scope_course`: Specifies course for course-specific events

2. **Sets default values:**
   - All existing events are set to UNIVERSITY_WIDE scope

3. **Adds performance indexes:**
   - Index on scope_type for faster filtering
   - Conditional indexes on scope_college and scope_course

## Verification
After running the migration, verify it worked by checking:
```sql
-- Check the new columns exist
\d events

-- Verify existing events have the default scope
SELECT id, title, scope_type, scope_college, scope_course FROM events LIMIT 5;
```

## Rollback (if needed)
If you need to rollback this migration:
```sql
ALTER TABLE events 
DROP COLUMN scope_type,
DROP COLUMN scope_college,
DROP COLUMN scope_course;

DROP INDEX IF EXISTS idx_events_scope_type;
DROP INDEX IF EXISTS idx_events_scope_college;
DROP INDEX IF EXISTS idx_events_scope_course;
``` 