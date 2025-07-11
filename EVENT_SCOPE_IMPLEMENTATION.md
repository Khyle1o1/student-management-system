# Event Scope Implementation Guide

## Overview

This implementation adds event scope functionality to the Student Management System, allowing events to be scoped to:

1. **University-wide** - All students across all colleges can attend
2. **College-wide** - Only students within a specific college can attend  
3. **Course-specific** - Only students from a specific course can attend

## Implementation Summary

### 1. Database Schema Changes

**New columns added to `events` table:**
- `scope_type`: ENUM ('UNIVERSITY_WIDE', 'COLLEGE_WIDE', 'COURSE_SPECIFIC')
- `scope_college`: TEXT (nullable, required for college-wide and course-specific events)
- `scope_course`: TEXT (nullable, required for course-specific events)

**Migration file:** `migration_add_event_scope.sql`

### 2. TypeScript Types & Constants

**Files Updated:**
- `src/lib/constants/academic-programs.ts` - Added event scope constants and types
- `src/lib/supabase.ts` - Updated database type definitions
- `src/lib/validations.ts` - Added scope validation to event schema

### 3. Frontend Components

**Event Form (`src/components/dashboard/event-form.tsx`):**
- Added scope selection section
- Dynamic college/course dropdowns based on scope type
- Validation for scope requirements
- Visual feedback showing attendance impact

**Events Table (`src/components/dashboard/events-table.tsx`):**
- Added scope column showing scope type and details
- Updated interface to include scope fields
- Proper display of college/course information

### 4. Backend APIs

**Events API (`src/app/api/events/route.ts`):**
- Updated to handle scope fields in GET and POST requests
- Added proper validation using updated schema

**Individual Event API (`src/app/api/events/[id]/route.ts`):**
- New API route for GET, PUT, DELETE operations
- Supports scope field updates

**Attendance Students API (`src/app/api/attendance/students/route.ts`):**
- **KEY FEATURE**: Filters students based on event scope
- University-wide: Shows all students
- College-wide: Shows only students from specified college
- Course-specific: Shows only students from specified course

### 5. Attendance & Reporting Impact

**Scope-Aware Attendance:**
- Attendance tracking now respects event scope
- Only eligible students appear in attendance lists
- Attendance statistics are scope-accurate

**Reporting Benefits:**
- University-wide events: "1,300 out of 7,300 students attended"
- College-wide events: "45 out of 320 Engineering students attended"  
- Course-specific events: "28 out of 35 Computer Science students attended"

## Usage Examples

### Creating a University-wide Event
```typescript
{
  title: "Annual Graduation Ceremony",
  scope_type: "UNIVERSITY_WIDE",
  scope_college: null,
  scope_course: null
}
// All 7,300 students eligible for attendance
```

### Creating a College-wide Event  
```typescript
{
  title: "Engineering Job Fair",
  scope_type: "COLLEGE_WIDE", 
  scope_college: "College of Technologies",
  scope_course: null
}
// Only students from College of Technologies eligible
```

### Creating a Course-specific Event
```typescript
{
  title: "Computer Science Workshop",
  scope_type: "COURSE_SPECIFIC",
  scope_college: "College of Technologies", 
  scope_course: "Bachelor of Science in Information Technology"
}
// Only IT students eligible for attendance
```

## Key Files Modified

### Frontend
- `src/components/dashboard/event-form.tsx` - Event creation/editing with scope
- `src/components/dashboard/events-table.tsx` - Display scope information
- `src/lib/constants/academic-programs.ts` - Scope constants and types

### Backend  
- `src/app/api/events/route.ts` - Main events API with scope support
- `src/app/api/events/[id]/route.ts` - Individual event operations
- `src/app/api/attendance/students/route.ts` - Scope-aware student filtering

### Configuration
- `src/lib/validations.ts` - Schema validation with scope rules
- `src/lib/supabase.ts` - Updated type definitions
- `schema.sql` - Updated base schema
- `migration_add_event_scope.sql` - Migration for existing databases

## Setup Instructions

1. **Apply Database Migration:**
   - Run the SQL in `migration_add_event_scope.sql` 
   - See `DATABASE_MIGRATION_GUIDE.md` for detailed steps

2. **No Frontend Changes Required:**
   - All UI updates are automatically available
   - Existing events default to University-wide scope

3. **Test the Feature:**
   - Create a new event and select different scopes
   - Verify attendance tracking shows only eligible students
   - Check that reports reflect the correct scope statistics

## Benefits

✅ **Precise Attendance Tracking**: Only eligible students appear in attendance lists  
✅ **Accurate Reporting**: Statistics reflect actual scope (not all students)  
✅ **Flexible Event Management**: Support for different event types and audiences  
✅ **Backward Compatibility**: Existing events work as University-wide  
✅ **Performance Optimized**: Database indexes for fast scope filtering  
✅ **User-Friendly Interface**: Clear scope selection with helpful descriptions  

## Future Enhancements

- **Year Level Filtering**: Add year-specific events (e.g., "Senior Students Only")
- **Department Filtering**: More granular than college (e.g., "CS Department")
- **Custom Student Groups**: Ad-hoc groups for special events
- **Auto-Registration**: Automatically register eligible students
- **Email Notifications**: Scope-aware event notifications 