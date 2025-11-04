# User Management Module

A comprehensive role-based access control (RBAC) system for managing users and permissions in the Student Management System.

## 📋 Table of Contents

- [Overview](#overview)
- [User Hierarchy & Roles](#user-hierarchy--roles)
- [Features](#features)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [Access Control Matrix](#access-control-matrix)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Security](#security)

## Overview

The User Management Module implements a hierarchical role-based access control system with three organizational tiers:

1. **System Administrator (ADMIN)** - Supreme Student Council
2. **College Organization (COLLEGE_ORG)** - College-level management
3. **Course Organization (COURSE_ORG)** - Course-level management

## User Hierarchy & Roles

### 🔴 System Administrator (ADMIN)
**Who**: Supreme Student Council

**Capabilities**:
- ✅ Full system access
- ✅ Create, edit, and archive all user types
- ✅ View and manage all colleges, courses, students
- ✅ Access all attendance reports and fees data
- ✅ Manage university-wide events and fees

**Access Scope**: Entire system

### 🟢 College Organization (COLLEGE_ORG)
**Who**: College-level administrators

**Capabilities**:
- ✅ Manage students within assigned college
- ✅ Create/manage Course Organization users under their college
- ✅ View/manage events scoped to their college
- ✅ Manage fees for their college
- ✅ Generate reports for their college
- ⚠️ Limited to assigned college only

**Access Scope**: Single assigned college

### 🔵 Course Organization (COURSE_ORG)
**Who**: Course-level administrators

**Capabilities**:
- ✅ Manage students in assigned course
- ✅ View/manage course-specific events
- ✅ Manage fees for their course
- ✅ Generate reports for their course
- ❌ Cannot manage other users

**Access Scope**: Single assigned course within a college

### 👤 Student (USER)
**Who**: Regular students

**Capabilities**:
- ✅ View own profile and attendance
- ✅ View own fees and payments
- ✅ View own certificates
- ❌ No administrative access

**Access Scope**: Own data only

## Features

### ✨ Core Functionalities

#### 1. Add User
- Create new users with role selection
- Assign college and course based on role
- Automatic validation of assignments
- Email uniqueness checking
- Secure password hashing

#### 2. Edit User
- Update user information
- Change roles and permissions
- Reassign college/course
- Modify user status

#### 3. Archive User
- Soft delete (temporary deactivation)
- User loses access immediately
- Data retained for audit purposes
- Can be reactivated if needed

#### 4. User Status Management
- **Active**: Normal access granted
- **Archived**: No access, data retained
- **Suspended**: Temporarily restricted

#### 5. Automatic Cleanup
- Users archived for 2+ years are permanently deleted
- Automated via cron job
- All actions logged for audit

### 🎨 User Interface

#### Dashboard Location
- **Menu Item**: "Users" (below "Settings")
- **Access**: Admin and College Org only
- **Icon**: UserCog icon

#### Users Page Components

1. **Header Section**
   - Page title and description
   - "Add User" button

2. **Filters Section**
   - Search by name/email
   - Filter by role
   - Filter by status
   - Filter by college

3. **Users Table**
   - Displays: Name, Email, Role, College, Course, Status, Date Added
   - Actions: Edit, Archive
   - Responsive design

4. **User Dialog**
   - Create/Edit user form
   - Role-based field visibility
   - Real-time validation

## Installation

### Step 1: Run Database Migration

```bash
# Connect to your database and run:
psql -U your_user -d your_database -f user_management_migration.sql
```

Or if using Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `user_management_migration.sql`
3. Execute the SQL

### Step 2: Update Environment Variables (Optional)

For cron job security, add to `.env`:

```env
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Deploy

The module is ready to use after migration. No additional configuration required.

### Step 4: Setup Cron Job (Optional)

See [CRON_SETUP.md](./CRON_SETUP.md) for automated cleanup configuration.

## Usage Guide

### For System Administrators

#### Creating a College Organization User

1. Navigate to **Dashboard → Users**
2. Click **"+ Add User"**
3. Fill in the form:
   - **Name**: Full name
   - **Email**: Unique email address
   - **Password**: Minimum 8 characters
   - **Role**: Select "College Organization"
   - **Assigned College**: Select college
4. Click **"Create User"**

#### Creating a Course Organization User

1. Navigate to **Dashboard → Users**
2. Click **"+ Add User"**
3. Fill in the form:
   - **Name**: Full name
   - **Email**: Unique email address
   - **Password**: Minimum 8 characters
   - **Role**: Select "Course Organization"
   - **Assigned College**: Select college
   - **Assigned Course**: Select course
4. Click **"Create User"**

### For College Organizations

#### Creating a Course Organization User

1. Navigate to **Dashboard → Users**
2. Click **"+ Add User"**
3. Fill in the form:
   - **Name**: Full name
   - **Email**: Unique email address
   - **Password**: Minimum 8 characters
   - **Role**: "Course Organization" (automatically selected)
   - **Assigned College**: Your college (pre-filled)
   - **Assigned Course**: Select course
4. Click **"Create User"**

**Note**: College Organizations can only create Course Organizations under their assigned college.

### Archiving a User

1. Navigate to **Dashboard → Users**
2. Find the user in the table
3. Click the **Archive** button (📦)
4. Confirm the action
5. User status changes to "Archived"

### Editing a User

1. Navigate to **Dashboard → Users**
2. Find the user in the table
3. Click the **Edit** button (✏️)
4. Update the information
5. Click **"Save Changes"**

### Filtering Users

Use the filter section to:
- **Search**: Type name or email
- **Role**: Filter by user role
- **Status**: Filter by status (Active/Archived/Suspended)
- **College**: Filter by college

## Access Control Matrix

| Role | Students | Events | Fees | Reports | Manage Users |
|------|----------|--------|------|---------|--------------|
| **ADMIN** | ✅ All Colleges | ✅ All | ✅ All | ✅ All | ✅ Full |
| **COLLEGE_ORG** | ✅ Assigned College | ✅ Assigned College | ✅ Assigned College | ✅ Assigned College | ⚠️ Course Orgs Only |
| **COURSE_ORG** | ✅ Assigned Course | ✅ Assigned Course | ✅ Assigned Course | ✅ Assigned Course | ❌ None |
| **USER** | ❌ Self Only | ❌ View Only | ❌ Self Only | ❌ None | ❌ None |

### Detailed Permissions

#### Student Management
- **ADMIN**: All students across all colleges
- **COLLEGE_ORG**: Students in assigned college
- **COURSE_ORG**: Students in assigned course
- **USER**: Own profile only

#### Event Management
- **ADMIN**: All events (university-wide, college, course)
- **COLLEGE_ORG**: College-wide and course-specific events in their college
- **COURSE_ORG**: Course-specific events in their course
- **USER**: View relevant events only

#### Fee Management
- **ADMIN**: All fees and payments
- **COLLEGE_ORG**: Fees for their college
- **COURSE_ORG**: Fees for their course
- **USER**: Own fees and payments

## API Reference

### GET /api/users

Fetch all users (filtered by role).

**Authentication**: Required (Session)

**Permissions**: ADMIN or COLLEGE_ORG

**Query Parameters**:
- `role` (optional): Filter by role
- `status` (optional): Filter by status
- `college` (optional): Filter by college
- `search` (optional): Search by name or email

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "COLLEGE_ORG",
      "status": "ACTIVE",
      "assigned_college": "College of Engineering",
      "assigned_course": null,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/users

Create a new user.

**Authentication**: Required (Session)

**Permissions**: ADMIN or COLLEGE_ORG

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "name": "Jane Smith",
  "role": "COURSE_ORG",
  "assigned_college": "College of Engineering",
  "assigned_course": "Computer Science"
}
```

**Response**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "Jane Smith",
    "role": "COURSE_ORG",
    "status": "ACTIVE",
    "assigned_college": "College of Engineering",
    "assigned_course": "Computer Science",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### GET /api/users/[id]

Get a specific user by ID.

**Authentication**: Required (Session)

**Permissions**: ADMIN or COLLEGE_ORG (with college match)

**Response**: Same as individual user object above

### PATCH /api/users/[id]

Update a user.

**Authentication**: Required (Session)

**Permissions**: ADMIN or COLLEGE_ORG (for Course Orgs in their college)

**Request Body**:
```json
{
  "name": "Updated Name",
  "role": "COURSE_ORG",
  "assigned_college": "College of Engineering",
  "assigned_course": "Information Technology",
  "status": "ACTIVE"
}
```

**Response**:
```json
{
  "message": "User updated successfully",
  "user": { /* updated user object */ }
}
```

### DELETE /api/users/[id]

Archive a user (soft delete).

**Authentication**: Required (Session)

**Permissions**: ADMIN or COLLEGE_ORG (for Course Orgs in their college)

**Response**:
```json
{
  "message": "User archived successfully"
}
```

### GET /api/cron/cleanup-archived-users

Automated cleanup of users archived for 2+ years.

**Authentication**: Optional (CRON_SECRET via header)

**Permissions**: Public (if no CRON_SECRET) or authorized cron job

**Response**:
```json
{
  "message": "Successfully deleted 5 user(s)",
  "deleted_count": 5,
  "deleted_users": [
    {
      "id": "uuid",
      "email": "olduser@example.com",
      "name": "Old User",
      "archived_at": "2021-11-03T00:00:00.000Z"
    }
  ]
}
```

## Database Schema

### Updated `users` Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    assigned_college VARCHAR(100),      -- NEW
    assigned_course VARCHAR(100),       -- NEW
    status VARCHAR(50) DEFAULT 'ACTIVE', -- NEW
    archived_at TIMESTAMP WITH TIME ZONE, -- NEW
    deleted_at TIMESTAMP WITH TIME ZONE,  -- NEW
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT users_role_check 
        CHECK (role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG', 'USER')),
    CONSTRAINT users_status_check 
        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'SUSPENDED'))
);
```

### New `user_audit_log` Table

```sql
CREATE TABLE user_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Tracked Actions**:
- `USER_CREATED` - New user created
- `USER_UPDATED` - User information updated
- `USER_ARCHIVED` - User archived
- `USER_AUTO_DELETED` - User auto-deleted by cron (2+ years)

### Database Functions

#### `has_access_to_college(user_id, target_college)`

Check if a user has access to a specific college.

**Returns**: `BOOLEAN`

#### `has_access_to_course(user_id, target_college, target_course)`

Check if a user has access to a specific course.

**Returns**: `BOOLEAN`

#### `cleanup_old_archived_users()`

Manually trigger cleanup of users archived for 2+ years.

**Returns**: `void`

**Usage**:
```sql
SELECT cleanup_old_archived_users();
```

## Security

### Authentication
- All API routes require valid session
- NextAuth.js handles authentication
- JWT tokens with role information

### Authorization
- Role-based access control (RBAC)
- Permission checks on every API call
- Database-level access functions

### Password Security
- Bcrypt hashing (cost factor: 12)
- Minimum 8 characters required
- No password stored in plain text

### Audit Trail
- All user actions logged in `user_audit_log`
- Includes: action type, performer, timestamp, details
- Permanent record for compliance

### Data Protection
- Soft delete (deleted_at) preserves data
- Hard delete only via database admin
- Archived users lose access immediately
- 2-year retention before auto-deletion

### API Security
- Session-based authentication
- CSRF protection
- Rate limiting (recommended to add)
- Input validation via Zod schemas

### Cron Job Security
- Optional CRON_SECRET environment variable
- Bearer token authentication
- Prevents unauthorized cleanup triggers

## File Structure

```
student-management-system/
├── user_management_migration.sql          # Database migration
├── vercel-cron.json                       # Vercel cron configuration
├── CRON_SETUP.md                          # Cron job setup guide
├── USER_MANAGEMENT_MODULE.md              # This documentation
│
├── src/
│   ├── lib/
│   │   ├── rbac.ts                        # RBAC utilities and helpers
│   │   └── auth.ts                        # Updated with new role types
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── users/
│   │   │   │   ├── route.ts               # GET, POST /api/users
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts           # GET, PATCH, DELETE /api/users/[id]
│   │   │   │
│   │   │   └── cron/
│   │   │       └── cleanup-archived-users/
│   │   │           └── route.ts           # Automated cleanup job
│   │   │
│   │   └── dashboard/
│   │       └── users/
│   │           └── page.tsx               # Users management page
│   │
│   └── components/
│       └── dashboard/
│           ├── users-table.tsx            # Users table component
│           └── dashboard-shell.tsx        # Updated with Users menu
```

## Best Practices

### 1. User Creation
- Always use strong passwords (8+ characters)
- Verify email addresses before creating accounts
- Assign appropriate roles based on responsibilities
- Double-check college/course assignments

### 2. Role Assignment
- **ADMIN**: Reserve for Supreme Student Council only
- **COLLEGE_ORG**: One per college recommended
- **COURSE_ORG**: Multiple per college allowed
- Follow principle of least privilege

### 3. User Management
- Archive users instead of deleting manually
- Review archived users periodically
- Check audit logs for suspicious activity
- Update roles when responsibilities change

### 4. Security
- Enable CRON_SECRET for production
- Use HTTPS for all API calls
- Regularly review user permissions
- Monitor audit logs

### 5. Data Retention
- Archived users retained for 2 years
- Audit logs retained indefinitely
- Review before auto-deletion runs

## Troubleshooting

### Users can't log in after role change
**Solution**: Clear session cache or have user log out and log back in.

### College Org can't see Course Org users
**Solution**: Ensure Course Org's `assigned_college` matches College Org's `assigned_college`.

### Cron job not running
**Solution**: Check [CRON_SETUP.md](./CRON_SETUP.md) for proper configuration.

### Permission denied when creating user
**Solution**: Verify the current user has permission to create that role type.

### Can't archive user
**Solution**: Ensure you have permission to manage that user and user is not yourself.

## Future Enhancements

Potential improvements for future versions:

- [ ] Bulk user import via CSV
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] Email notifications for user actions
- [ ] Advanced reporting and analytics
- [ ] User activity dashboard
- [ ] Fine-grained permissions (beyond role-based)
- [ ] API rate limiting
- [ ] User session management

## Support

For issues or questions:
1. Check this documentation
2. Review API responses for error messages
3. Check `user_audit_log` for audit trail
4. Consult database schema

## Changelog

### Version 1.0.0 (2025-11-03)
- Initial release
- Role-based access control
- User management UI
- Automated cleanup job
- Comprehensive API
- Audit logging

