# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This system implements comprehensive role-based access control with the following user types:

### 1. **Admin** (System Administrator)
- **Full System Access**
- Can create and manage all user accounts
- Access to all pages and features
- Can view and manage all data across the system

### 2. **Events Staff**
- **Limited Access**
- ✅ **Can Access:**
  - Events Page (create, edit, delete events)
  - Attendance Management (create, edit, delete attendance records)
  - Certificates Page (manage certificates)
  - Evaluations Page (manage evaluations)
  
- ❌ **Cannot Access:**
  - Dashboard analytics
  - User management
  - Intramurals page
  - System settings
  - Students page
  - Fees page

### 3. **Intramurals Staff**
- **Highly Restricted Access**
- ✅ **Can Access:**
  - Intramurals Page only
  
- ❌ **Cannot Access:**
  - Events
  - Attendance
  - Certificates
  - Evaluations
  - User management
  - System settings
  - Dashboard analytics

### 4. **College Organization** (Existing)
- Access based on assigned college
- Can manage events, fees, students within their college

### 5. **Course Organization** (Existing)
- Access based on assigned course(s)
- Can manage events, fees, students within their course(s)

### 6. **User** (Student)
- Personal dashboard access
- View own fees, certificates, attendance

---

## Database Setup

### Step 1: Run the Migration

Execute the SQL migration script to add the new roles:

```bash
# Using psql (PostgreSQL)
psql -U your_username -d your_database -f scripts/add-new-roles-migration.sql

# Or in Supabase SQL Editor:
# Copy and paste the contents of scripts/add-new-roles-migration.sql
```

### Step 2: Verify Roles

The following roles should now be available in your `users` table:
- `ADMIN`
- `EVENTS_STAFF`
- `INTRAMURALS_STAFF`
- `COLLEGE_ORG`
- `COURSE_ORG`
- `USER`

---

## Creating User Accounts

### As Admin (via UI)

1. **Log in as Admin**
2. Navigate to **Dashboard > Users**
3. Click **"Add New User"**
4. Fill in the form:
   - **Name**: Full name of the user
   - **Email**: User's email address
   - **Password**: Minimum 8 characters
   - **Role**: Select from dropdown:
     - `System Administrator (SSC)` - Full access
     - `Events Staff` - Events/Attendance/Certificates/Evaluations only
     - `Intramurals Staff` - Intramurals only
     - `College Organization` - College-level access
     - `Course Organization` - Course-level access
   
5. **For Events Staff and Intramurals Staff:**
   - No college/course assignment needed
   - Click "Create User"

6. **For College/Course Org:**
   - Select assigned college and/or course(s)
   - Click "Create User"

### Via API

```bash
POST /api/users
Content-Type: application/json
Authorization: Bearer <admin-session-token>

{
  "email": "staff@example.com",
  "password": "SecurePassword123",
  "name": "Staff Member",
  "role": "EVENTS_STAFF"
}
```

---

## Access Control Matrix

| Page/Feature | Admin | Events Staff | Intramurals Staff | College Org | Course Org | Student |
|-------------|-------|--------------|-------------------|-------------|------------|---------|
| Dashboard Analytics | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Events Page | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Attendance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Certificates | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (own) |
| Evaluations | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Intramurals | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Students | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Fees | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ (own) |
| Reports | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Security Implementation

### Backend Protection

All API routes are protected with role-based middleware:

```typescript
// Example: Events API
if (!['ADMIN','EVENTS_STAFF','COLLEGE_ORG','COURSE_ORG'].includes(role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Frontend Protection

1. **Navigation Menu**: Dynamically filtered based on user role
2. **Page Guards**: Server-side redirects for unauthorized access
3. **Component Guards**: Client-side role checks

### Direct URL Protection

Even if a user tries to access a page directly via URL:
- Server-side auth checks redirect unauthorized users to `/403`
- API calls return `403 Forbidden` for unauthorized requests

---

## Testing the Implementation

### Test Events Staff Access

1. Create an Events Staff account
2. Log in with the new credentials
3. **Should See**: Events, Attendance, Certificates, Evaluations in navigation
4. **Should NOT See**: Dashboard, Students, Fees, Reports, Users, Settings
5. Try accessing `/dashboard/settings` directly → Should redirect to `/403`

### Test Intramurals Staff Access

1. Create an Intramurals Staff account
2. Log in with the new credentials
3. **Should See**: Only Intramurals in navigation
4. **Should NOT See**: Any other menu items
5. Try accessing `/dashboard/events` directly → Should redirect to `/403`

### Test API Protection

```bash
# As Events Staff - Should succeed
curl -X POST /api/events \
  -H "Authorization: Bearer <events-staff-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Event","date":"2026-02-01"}'

# As Events Staff - Should fail (403)
curl -X GET /api/intramurals/admin/settings \
  -H "Authorization: Bearer <events-staff-token>"

# As Intramurals Staff - Should succeed
curl -X GET /api/intramurals/admin/settings \
  -H "Authorization: Bearer <intramurals-staff-token>"

# As Intramurals Staff - Should fail (403)
curl -X GET /api/events \
  -H "Authorization: Bearer <intramurals-staff-token>"
```

---

## Troubleshooting

### User Cannot Log In

1. Verify the user exists in the database:
   ```sql
   SELECT id, email, role, status FROM users WHERE email = 'user@example.com';
   ```

2. Check the status is `ACTIVE`:
   ```sql
   UPDATE users SET status = 'ACTIVE' WHERE email = 'user@example.com';
   ```

### User Gets "Forbidden" Error

1. Verify the user's role:
   ```sql
   SELECT email, role FROM users WHERE email = 'user@example.com';
   ```

2. Check if the role matches the required permission for the page/feature

### Navigation Menu Not Showing Correct Items

1. Clear browser cache and cookies
2. Log out and log back in
3. Verify the role in the database matches expectations

---

## Code Structure

### Key Files Modified

1. **`src/lib/rbac.ts`**
   - Core RBAC utility functions
   - Role definitions and permission checks

2. **`src/lib/route-protection.ts`**
   - Server-side route protection middleware
   - Permission checking helpers

3. **`src/lib/auth.ts`**
   - Updated NextAuth configuration for new roles
   - Session management with role information

4. **`src/components/role-guard.tsx`**
   - Client-side role guard component
   - Prevents unauthorized component rendering

5. **`src/components/dashboard/dashboard-shell.tsx`**
   - Dynamic navigation based on user role
   - Menu visibility control

6. **API Routes**
   - `/api/events/route.ts` - Events Staff can create/manage
   - `/api/intramurals/**` - Intramurals Staff can access
   - All routes validated with role checks

---

## Maintenance

### Adding a New Role

1. Update `src/lib/rbac.ts`:
   ```typescript
   export type UserRole = 'ADMIN' | 'EVENTS_STAFF' | 'INTRAMURALS_STAFF' | 'NEW_ROLE' | ...
   ```

2. Update auth types in `src/lib/auth.ts`

3. Add permission functions in `src/lib/rbac.ts`

4. Update navigation in `src/components/dashboard/dashboard-shell.tsx`

5. Protect relevant API routes

6. Run database migration to support the new role

### Modifying Permissions

Edit the permission functions in `src/lib/rbac.ts`:
```typescript
export function canAccessFeature(user: UserPermissions | null): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  return user.role === 'ADMIN' || user.role === 'NEW_ROLE';
}
```

---

## Security Best Practices

✅ **DO:**
- Always check permissions on both frontend AND backend
- Use server-side auth checks for page access
- Validate role in API routes before processing requests
- Log access attempts for audit trails

❌ **DON'T:**
- Rely solely on frontend role checks
- Expose sensitive data in API responses based on role
- Allow users to self-assign roles
- Cache role information too long

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments in key files
3. Test with different role accounts
4. Verify database role values match code expectations

---

**Implementation Complete** ✅

All role-based access controls are now active and protecting your system.
