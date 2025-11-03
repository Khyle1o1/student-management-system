# Student Archive System Implementation

## Overview
The Student Management System has been updated with a comprehensive archive system that replaces the previous delete functionality. This document describes the implementation and usage of the new system.

## Key Features

### 1. Archive Instead of Delete
- **Delete buttons removed**: Students can no longer be deleted manually through the UI
- **Archive functionality**: Students can be archived, hiding them from the active student list
- **Automatic deletion**: Archived students are automatically deleted after 2 years
- **Reversible**: Archived students can be unarchived and restored to the active list

### 2. Student Details Modal
A new comprehensive student details view that displays:
- **Basic Information**: Name, ID, Email, Phone, College, Course, Year Level, Enrollment Date
- **Attendance Summary**: 
  - Total events attended
  - Total events missed
  - Detailed list of all attendance records with event details
- **Payment Status**:
  - List of all assigned fees
  - Payment status (Paid/Unpaid)
  - Manual payment status management
  - Due dates and amounts

### 3. Filter System
A dropdown filter at the top of the students page with three options:
- **Active Students** (default): Shows only non-archived students
- **Archived Students**: Shows only archived students with a notice about auto-deletion
- **All Students**: Shows both active and archived students

### 4. Status Badges
Visual indicators throughout the interface:
- **Active/Archived status**: Green badge for active, yellow badge for archived
- **Year Level badges**: Color-coded badges (1st Year = Green, 2nd = Blue, 3rd = Yellow, 4th = Red)
- **Payment status**: Green for paid, red for unpaid
- **Attendance status**: Green for attended, red for missed

## Database Changes

### Migration File: `archive_system_migration.sql`

#### New Fields Added to `students` Table:
- `archived` (BOOLEAN, default FALSE): Indicates if a student is archived
- `archived_at` (TIMESTAMP WITH TIME ZONE): Timestamp when the student was archived

#### New Indexes:
- `idx_students_archived`: Index on archived field for faster filtering
- `idx_students_archived_at`: Index on archived_at for cleanup queries

#### New Function:
- `delete_old_archived_students()`: Automatically deletes students archived more than 2 years ago

## API Endpoints

### Modified Endpoints

#### GET `/api/students`
**New Query Parameters:**
- `filter`: `"active"` | `"archived"` | `"all"` (default: `"active"`)

**Response includes:**
- `archived`: Boolean indicating archive status
- `archivedAt`: Timestamp of when the student was archived

#### GET `/api/students/[id]`
**Enhanced response includes:**
- **Attendance Summary**: 
  - `attended`: Count of attended events
  - `missed`: Count of missed events
  - `total`: Total events
  - `records`: Array of detailed attendance records with event information
- **Payment Summary**:
  - `paid`: Count of paid fees
  - `unpaid`: Count of unpaid fees
  - `total`: Total fees
  - `records`: Array of detailed payment records with fee information

### New Endpoints

#### POST `/api/students/[id]/archive`
Archives or unarchives a student (toggles the archive status).

**Request:** No body required

**Response:**
```json
{
  "success": true,
  "student": { /* updated student object */ },
  "message": "Student archived successfully" | "Student unarchived successfully"
}
```

#### PATCH `/api/payments/[id]/status`
Updates the payment status of a specific payment record.

**Request Body:**
```json
{
  "status": "PAID" | "UNPAID" | "PENDING" | "OVERDUE"
}
```

**Response:**
```json
{
  "success": true,
  "payment": { /* updated payment object */ },
  "message": "Payment status updated successfully"
}
```

### Deprecated Endpoints

#### DELETE `/api/students/[id]`
**Status:** Removed
**Reason:** Students should be archived, not deleted

#### DELETE `/api/students/bulk-delete`
**Status:** Returns 410 Gone
**Message:** "Bulk delete is no longer supported. Use archive functionality instead."

## Components

### New Components

#### `student-details-modal.tsx`
A comprehensive modal dialog that displays:
- Student basic information
- Attendance summary cards
- Payment summary cards
- Tabbed view with detailed records
- Payment status management buttons

**Props:**
- `studentId`: The ID of the student to display
- `open`: Boolean to control modal visibility
- `onClose`: Callback when modal is closed

**Usage:**
```tsx
<StudentDetailsModal
  studentId={selectedStudentId}
  open={showDetailsModal}
  onClose={() => setShowDetailsModal(false)}
/>
```

### Modified Components

#### `students-table.tsx`
**Removed:**
- Delete All Students button
- Individual delete buttons in action menu

**Added:**
- Filter dropdown (Active/Archived/All)
- Archive/Unarchive action in menu
- View Details action in menu
- Status column with badges
- Archive confirmation modal
- Student details modal integration

**Features:**
- Clicking student name opens details modal
- Archive action shows confirmation with auto-deletion notice
- Archived students list shows 2-year deletion notice

## Usage Guide

### For Administrators

#### Archiving a Student
1. Navigate to the Students page
2. Find the student in the list
3. Click the three-dot menu (⋮) on the right
4. Select "Archive"
5. Confirm the action (note: student will be auto-deleted after 2 years)

#### Viewing Archived Students
1. Use the filter dropdown at the top
2. Select "Archived Students"
3. View the list of archived students
4. Notice the yellow badge indicating "Archived students are automatically deleted after 2 years"

#### Unarchiving a Student
1. Filter to show archived students
2. Find the student to restore
3. Click the three-dot menu (⋮)
4. Select "Unarchive"
5. Confirm the action
6. Student will be restored to the active list

#### Viewing Student Details
1. Click on the student's name in the list, OR
2. Click the three-dot menu and select "View Details"
3. Modal opens showing:
   - Basic information
   - Attendance summary with counts
   - Payment summary with counts
   - Detailed records in tabs

#### Managing Payment Status
1. Open student details modal
2. Go to the "Payment Records" tab
3. Find the payment to update
4. Click "Mark as Paid" or "Mark as Unpaid"
5. Status updates immediately

### For System Administrators

#### Running the Migration
```bash
psql -d your_database -f archive_system_migration.sql
```

#### Setting Up Auto-Deletion (Optional)
The migration creates a function `delete_old_archived_students()` that can be scheduled using:

**Using pg_cron:**
```sql
SELECT cron.schedule('delete-old-archived-students', '0 2 * * *', 'SELECT delete_old_archived_students();');
```

**Using a cron job:**
```bash
# Add to crontab
0 2 * * * psql -d your_database -c "SELECT delete_old_archived_students();"
```

**Using application scheduler:**
Create a periodic task in your application to call this function daily.

## Benefits

### Data Safety
- Prevents accidental permanent deletion
- Maintains data integrity with 2-year retention
- Allows recovery of mistakenly archived students

### Compliance
- Meets data retention requirements
- Provides audit trail (archived_at timestamp)
- Automatic cleanup after retention period

### User Experience
- Clear visual indicators (badges)
- Comprehensive student information in one view
- Easy payment status management
- Intuitive archive/unarchive workflow

## Security Considerations

- All endpoints require ADMIN role authentication
- Archive actions are logged with timestamps
- Related records (attendance, payments) are preserved during archive
- CASCADE deletion ensures clean removal after 2 years

## Technical Notes

### Cascade Behavior
When a student is automatically deleted after 2 years:
- Related attendance records are deleted (CASCADE)
- Related payment records are deleted (CASCADE)
- Related certificates are deleted (CASCADE)
- User account is deleted (CASCADE)

### Performance
- Indexes on `archived` and `archived_at` ensure fast filtering
- Pagination is maintained across all filter views
- Query optimization for attendance and payment summaries

### Future Enhancements
Consider implementing:
- Email notifications before auto-deletion
- Export archived student data before deletion
- Bulk archive operations
- Archive reason/notes field
- Admin activity log for archive actions

## Troubleshooting

### Students Not Showing After Archive
- Check the filter dropdown - ensure "Active Students" is selected
- Archived students only appear in "Archived Students" or "All Students" views

### Payment Status Not Updating
- Ensure proper ADMIN role authentication
- Check browser console for error messages
- Verify payment record exists in database

### Auto-Deletion Not Working
- Verify the `delete_old_archived_students()` function is scheduled
- Check database logs for execution
- Manually run the function to test: `SELECT delete_old_archived_students();`

## Migration Checklist

- [x] Database migration applied
- [x] Archive API endpoints implemented
- [x] Payment status management API created
- [x] Student details modal created
- [x] Filter dropdown added
- [x] Delete buttons removed
- [x] Archive buttons added
- [x] Status badges implemented
- [x] Confirmation modals updated
- [x] Documentation created

## Version History

**Version 1.0** - November 2025
- Initial implementation of archive system
- Student details modal with attendance/payment integration
- Filter system with Active/Archived/All views
- Automatic 2-year deletion mechanism
- Payment status management

