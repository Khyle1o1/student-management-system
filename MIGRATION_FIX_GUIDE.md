# Migration Fix Guide - Complete Events Schema

## Issue Identified ❌
The events table is missing several columns that the API expects:
- `start_time` (missing)
- `end_time` (missing) 
- `type` (missing)
- `max_capacity` (missing)

**Error**: `Could not find the 'end_time' column of 'events' in the schema cache`

## Solution ✅

Apply the complete migration that adds all missing columns:

### Step 1: Apply Complete Migration
Run this SQL in your database:

```bash
# Connect to your database and run:
psql your_database < migration_complete_events_schema.sql
```

**OR using your database admin tool**, copy and paste the contents of `migration_complete_events_schema.sql`.

### Step 2: Verify Migration
Check that all columns exist by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY column_name;
```

You should see these columns:
- ✅ `created_at`
- ✅ `date`
- ✅ `description`
- ✅ `end_time` ← **This was missing**
- ✅ `id`
- ✅ `location`
- ✅ `max_capacity` ← **This was missing**
- ✅ `scope_college`
- ✅ `scope_course`
- ✅ `scope_type`
- ✅ `start_time` ← **This was missing**
- ✅ `title`
- ✅ `type` ← **This was missing**
- ✅ `updated_at`

### Step 3: Test Event Creation
1. Go to `/dashboard/events/new`
2. Fill out the form completely
3. Click "Create Event"
4. ✅ Should work without errors!

## What This Migration Does

### Adds Missing Columns
- `start_time TIME` - Event start time
- `end_time TIME` - Event end time  
- `type TEXT` - Event type (ACADEMIC, EXTRACURRICULAR, etc.)
- `max_capacity INTEGER` - Maximum attendees (optional)

### Ensures Scope Columns Exist
- `scope_type TEXT` - UNIVERSITY_WIDE, COLLEGE_WIDE, COURSE_SPECIFIC
- `scope_college TEXT` - College for scoped events
- `scope_course TEXT` - Course for course-specific events

### Sets Default Values
- Existing events get default start_time: 09:00
- Existing events get default end_time: 17:00
- Existing events get default type: ACADEMIC
- Existing events get default scope: UNIVERSITY_WIDE

### Adds Performance Indexes
- Indexes on type, scope fields for fast queries

## Safe Migration Features
✅ **Checks if columns exist** before adding (won't error if already applied)  
✅ **Sets sensible defaults** for existing data  
✅ **Includes proper constraints** and validation  
✅ **Adds indexes** for performance  
✅ **Fully documented** with comments  

## After Migration Applied
Your event system will have:
- ✅ Full event creation with all fields
- ✅ Complete scope functionality  
- ✅ Proper time management
- ✅ Event type categorization
- ✅ Capacity management
- ✅ No more database errors!

**Once you apply this migration, event creation will work perfectly! 🚀** 