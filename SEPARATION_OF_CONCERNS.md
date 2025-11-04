# Separation of Concerns: Students vs Administrative Users

## 📋 Overview

The system now has a **clear separation** between:
1. **Students** → Managed in the `students` table
2. **Administrative Users** → Managed in the `users` table

This document explains the architecture and rationale behind this separation.

---

## 🏗️ Architecture

### Before (Mixed)
```
users table
├── Students (role: USER) ← 1000+ records
├── Admins (role: ADMIN) ← Few records
└── Organizations ← Few records
```
**Problem**: Students and admins mixed in one table

### After (Separated)
```
students table
└── All Students ← 1000+ records
    ├── student_id
    ├── name
    ├── email
    ├── college
    ├── course
    └── year_level

users table (ONLY admins)
├── ADMIN (Supreme Student Council)
├── COLLEGE_ORG (College Organizations)
└── COURSE_ORG (Course Organizations)
```
**Solution**: Clear separation of concerns

---

## 🎯 Why This Separation?

### 1. **Different Purposes**

| Aspect | Students Table | Users Table |
|--------|---------------|-------------|
| **Purpose** | Student data & authentication | Access control & permissions |
| **Data** | Academic info (college, course, year) | Admin assignments (college, course) |
| **Count** | Thousands | Dozens |
| **Management** | Bulk imports, registrations | Manual creation, careful control |
| **Authentication** | Yes (via users.user_id) | Yes (direct) |

### 2. **Performance**

- **Students Table**: Optimized for bulk operations, searches, and reports
- **Users Table**: Small, focused on access control queries

### 3. **Security**

- **Students**: Cannot see or manage system access
- **Admin Users**: Have explicit permissions and audit trails

### 4. **Scalability**

- Students can grow to tens of thousands
- Admin users remain small and manageable

---

## 📊 Data Structure

### Students Table
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id), -- Optional: links to user account
    student_id VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    college VARCHAR(100),
    year_level INTEGER,
    course VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Use Cases**:
- Academic records
- Attendance tracking
- Fee management
- Certificate generation
- Reports and analytics

### Users Table (Administrative Only)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG')),
    assigned_college VARCHAR(100),  -- For COLLEGE_ORG and COURSE_ORG
    assigned_course VARCHAR(100),   -- For COURSE_ORG only
    status VARCHAR(50) DEFAULT 'ACTIVE',
    archived_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Use Cases**:
- System access control
- Permission management
- Administrative hierarchy
- Audit trails

---

## 🔐 Access Control Matrix

| Role | Students Access | Events Access | Fees Access | Reports Access | User Management |
|------|----------------|---------------|-------------|----------------|-----------------|
| **ADMIN** | ✅ All Colleges | ✅ All | ✅ All | ✅ All | ✅ Full Control |
| **COLLEGE_ORG** | ✅ Assigned College | ✅ Assigned College | ✅ Assigned College | ✅ Assigned College | ⚠️ Can create COURSE_ORG |
| **COURSE_ORG** | ✅ Assigned Course | ✅ Assigned Course | ✅ Assigned Course | ✅ Assigned Course | ❌ No Access |
| **Student** | ❌ Self Only | ❌ View Only | ❌ Self Only | ❌ None | ❌ No Access |

---

## 🔄 Authentication Flow

### Student Login
```
1. Student enters credentials
2. System checks:
   - users table (for account with user_id)
   - students table (linked via user_id)
3. If found:
   - role = 'USER'
   - isAdminUser = false
   - student_id populated
4. Dashboard shows student view
```

### Admin Login
```
1. Admin enters credentials
2. System checks:
   - users table (role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'))
3. If found:
   - role = ADMIN | COLLEGE_ORG | COURSE_ORG
   - isAdminUser = true
   - assigned_college/course populated
4. Dashboard shows admin view with permissions
```

---

## 🛠️ Implementation Details

### User Management Module

**Purpose**: Manage ONLY administrative users

**Features**:
- ✅ Create ADMIN, COLLEGE_ORG, COURSE_ORG
- ✅ Assign colleges and courses
- ✅ Archive/restore users
- ✅ Audit logging
- ✅ Auto-cleanup after 2 years
- ❌ Does NOT show students

**API Filtering**:
```typescript
// Only show administrative users
.in('role', ['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'])
```

### Student Management

**Location**: `/dashboard/students`

**Purpose**: Manage actual students

**Features**:
- Student CRUD operations
- Bulk imports
- Academic data
- Attendance tracking
- Fee management

---

## 🔍 How to Identify User Type

### In Code
```typescript
// Check if administrative user
if (session.user.isAdminUser) {
  // This is ADMIN, COLLEGE_ORG, or COURSE_ORG
  // Show user management, full dashboard
} else {
  // This is a student
  // Show student dashboard only
}
```

### In Database
```sql
-- Get all administrative users
SELECT * FROM users 
WHERE role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG')
AND deleted_at IS NULL;

-- Get all students
SELECT * FROM students;
```

---

## 📝 Best Practices

### 1. **Never Mix Concerns**
- Don't add students to the users table
- Don't add administrative fields to students table

### 2. **Use Appropriate APIs**
- `/api/users` → Administrative users only
- `/api/students` → Student data

### 3. **Check Permissions**
```typescript
import { canManageUsers, hasCollegeAccess } from '@/lib/rbac';

// Check if user can manage other users
if (!canManageUsers(currentUser)) {
  return unauthorized();
}

// Check college access for student data
if (!hasCollegeAccess(currentUser, studentCollege)) {
  return forbidden();
}
```

### 4. **Audit Trail**
All administrative user actions are logged in `user_audit_log`:
- User creation
- User updates
- User archival
- Auto-deletion

---

## 🚀 Migration Guide

### If You Have Students in Users Table

**Step 1**: Run the migration
```sql
-- The migration automatically handles this
-- It adds new columns and constraints
-- Existing data is preserved
```

**Step 2**: The API will filter
```typescript
// API automatically excludes non-admin users
.in('role', ['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'])
```

**Step 3**: Students still work
- Students linked via `students.user_id` still authenticate
- They see student dashboard
- No administrative access

---

## 📊 Summary

### Students Table
- **Purpose**: Academic data
- **Count**: Thousands
- **Management**: Bulk operations
- **Access**: Via /api/students

### Users Table
- **Purpose**: Access control
- **Count**: Dozens
- **Management**: Individual control
- **Access**: Via /api/users (filtered)

### Clear Benefits
✅ Better performance
✅ Clearer security model
✅ Easier to manage
✅ Scalable architecture
✅ Proper separation of concerns

---

## 🎓 Example Scenarios

### Scenario 1: Adding a New College Organization
```typescript
// Use User Management Module
POST /api/users
{
  "email": "engineering@admin.com",
  "password": "secure123",
  "name": "Engineering Admin",
  "role": "COLLEGE_ORG",
  "assigned_college": "College of Engineering"
}
```

### Scenario 2: Importing New Students
```typescript
// Use Student Management
POST /api/students/batch-import
{
  students: [
    {
      student_id: "2025123456",
      name: "John Doe",
      email: "john@student.buksu.edu.ph",
      college: "College of Engineering",
      course: "Computer Science",
      year_level: 1
    }
  ]
}
```

### Scenario 3: Checking Access
```typescript
// In your API route
const hasAccess = hasCollegeAccess(
  adminUser,
  student.college
);

if (!hasAccess) {
  return NextResponse.json(
    { error: 'No access to this college' },
    { status: 403 }
  );
}
```

---

## ✅ Checklist

After implementation, verify:

- [ ] User Management shows only ADMIN, COLLEGE_ORG, COURSE_ORG
- [ ] Students are NOT visible in User Management
- [ ] Students can still log in and see their dashboard
- [ ] Admin users can manage based on their role
- [ ] College Org can create Course Org under their college
- [ ] API endpoints filter correctly
- [ ] Permissions work as expected

---

**Date**: November 3, 2025  
**Status**: ✅ Implemented and Tested  
**Build**: ✅ Passing

