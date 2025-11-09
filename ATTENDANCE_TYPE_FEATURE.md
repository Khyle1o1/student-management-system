# Attendance Type Feature Documentation

## Overview
The Attendance Type feature allows administrators to configure how attendance will be tracked for each event. This provides flexibility in managing different types of events with varying attendance requirements.

## Feature Description

### Attendance Type Options

1. **In only** (Default)
   - Simple attendance tracking
   - Records only check-in time
   - Suitable for short events, meetings, or when only entry needs to be tracked
   - Attendance is considered complete when participant checks in

2. **In & Out**
   - Comprehensive attendance tracking
   - Requires both check-in and check-out times
   - Suitable for full-day events, workshops, seminars
   - Attendance is considered complete only when both timestamps are recorded

## Implementation Details

### 1. Database Migration
**File:** `attendance_type_migration.sql`

Run this migration to add the `attendance_type` column to the events table:

```bash
# Using psql
psql your_database < attendance_type_migration.sql

# Or copy the SQL content and execute in your database admin tool
```

The migration:
- Adds `attendance_type` column with default value `'IN_ONLY'`
- Includes a CHECK constraint to ensure only valid values (`'IN_ONLY'` or `'IN_OUT'`)
- Creates an index for better query performance
- Updates existing events to have `'IN_ONLY'` as the default

### 2. Create Event Form
**File:** `src/components/dashboard/event-form.tsx`

The "Create New Event" form now includes an "Attendance Type" field in the Event Details section:

- Located after the Location field
- Uses radio buttons for better UX
- Shows descriptive text for each option
- Default selection is "In only"
- Saves as `attendance_type` in the event data

**UI Example:**
```
🔘 In only
   Simple attendance tracking - records check-in time only

🔘 In & Out  
   Requires both entry and exit time - tracks full participation
```

### 3. API Updates

#### POST /api/events
Creates a new event with attendance_type field.

**Updated Schema:**
```typescript
{
  attendance_type: z.enum(['IN_ONLY', 'IN_OUT']).optional().nullable()
}
```

#### GET /api/events
Returns events list including attendance_type field.

#### GET /api/events/[id]
Returns single event details including attendance_type.

#### PUT /api/events/[id]
Updates event with attendance_type field.

### 4. TypeScript Type Definitions

**Updated Files:**
- `src/lib/supabase.ts` - Database types
- `src/lib/db.ts` - Event interface
- Event interfaces in components

**Type Definition:**
```typescript
attendance_type: 'IN_ONLY' | 'IN_OUT'
```

### 5. Event Details Display

#### Attendance Details Page
**File:** `src/app/dashboard/attendance/[id]/page.tsx`

The event details card now displays:
- Attendance Type label (e.g., "In & Out" or "In only")
- Descriptive text explaining the tracking method
- Visual indicator with icon

#### Admin Dashboard
**File:** `src/components/dashboard/admin-dashboard.tsx`

Event details modal shows:
- Attendance Type as a badge
- Color-coded: "In & Out" uses default variant, "In only" uses secondary variant

## Usage Guide

### For Administrators

1. **Creating a New Event:**
   - Navigate to "Events" → "Create New Event"
   - Fill in basic information (Title, Description)
   - In the "Event Details" section, you'll see "Attendance Type"
   - Select the appropriate option:
     - Choose **"In only"** for simple check-in tracking
     - Choose **"In & Out"** if you need to track both entry and exit

2. **Editing an Existing Event:**
   - Open the event for editing
   - The attendance type will be displayed and can be modified
   - Existing events default to "In only"

3. **Viewing Event Details:**
   - Event details page shows the attendance type
   - Attendance reports display the tracking method used

### For Attendance Tracking

When recording attendance:

- **In only mode:**
  - Only check-in time is required
  - Student is marked as "present" upon check-in
  - Check-out is optional

- **In & Out mode:**
  - Both check-in and check-out are required
  - Student attendance is complete only when both timestamps are recorded
  - Reports show incomplete attendance if check-out is missing

## Future Enhancements

The attendance_type field integrates with:

1. **Attendance Reports:**
   - Reports display whether event used "In only" or "In & Out" tracking
   - Statistics calculated based on attendance type

2. **Certificate Generation:**
   - Certificates consider attendance completion based on type
   - For "In & Out" events, certificate requires both timestamps

3. **CSV/PDF Exports:**
   - Exported reports include attendance type information
   - Helps identify incomplete attendance for "In & Out" events

## Technical Notes

### Default Behavior
- All new events default to `'IN_ONLY'`
- Existing events (before migration) will be set to `'IN_ONLY'`
- The field is required at the database level but has a default value

### Data Validation
- Backend validates that attendance_type is one of: `'IN_ONLY'` or `'IN_OUT'`
- Frontend enforces selection via radio buttons
- Database constraint ensures data integrity

### Backward Compatibility
- Existing events are automatically assigned `'IN_ONLY'`
- All API endpoints handle missing attendance_type gracefully
- Default values ensure no breaking changes

## Troubleshooting

### Migration Issues

If you encounter errors during migration:

1. Check if the column already exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'attendance_type';
```

2. Manually add if needed:
```sql
ALTER TABLE events 
ADD COLUMN attendance_type TEXT NOT NULL DEFAULT 'IN_ONLY' 
CHECK (attendance_type IN ('IN_ONLY', 'IN_OUT'));
```

### Display Issues

If attendance type doesn't show:
1. Ensure migration was applied successfully
2. Clear browser cache
3. Check that API returns attendance_type field
4. Verify event data includes the field

## Summary

This feature provides flexible attendance tracking options for different event types, improving the accuracy and usefulness of attendance records. The implementation is backward-compatible and includes comprehensive validation to ensure data integrity.

---

**Files Modified:**
- ✅ `attendance_type_migration.sql` (new)
- ✅ `src/components/dashboard/event-form.tsx`
- ✅ `src/app/api/events/route.ts`
- ✅ `src/app/api/events/[id]/route.ts`
- ✅ `src/lib/supabase.ts`
- ✅ `src/lib/db.ts`
- ✅ `src/app/dashboard/attendance/[id]/page.tsx`
- ✅ `src/components/dashboard/admin-dashboard.tsx`

**Database Changes:**
- ✅ New column: `events.attendance_type`
- ✅ Default value: `'IN_ONLY'`
- ✅ Constraint: CHECK (attendance_type IN ('IN_ONLY', 'IN_OUT'))
- ✅ Index: `idx_events_attendance_type`

