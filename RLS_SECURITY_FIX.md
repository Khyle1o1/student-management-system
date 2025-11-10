# Row Level Security (RLS) Fix for Forms System

## Security Issue Found
Supabase database linter detected that **Row Level Security (RLS) was not enabled** on the forms system tables, creating a critical security vulnerability.

### Tables Affected:
1. ❌ `evaluation_forms` - No RLS
2. ❌ `form_responses` - No RLS  
3. ❌ `form_analytics` - No RLS
4. ❌ `form_sections` - No RLS

**Risk Level:** 🔴 **CRITICAL** - Data could be accessed or modified without proper authorization!

---

## Solution: `enable_rls_forms_system.sql`

### What It Does:
1. ✅ **Enables RLS** on all 4 tables
2. ✅ **Creates secure policies** for SELECT, INSERT, UPDATE, DELETE
3. ✅ **Role-based access control** (ADMIN, COLLEGE_ORG, COURSE_ORG, STUDENT)
4. ✅ **Grants proper permissions** to authenticated and anonymous users

---

## Security Policies Implemented

### 📋 **evaluation_forms** (Forms Table)

**SELECT (View Forms):**
- ✅ Anyone can view PUBLISHED forms
- ✅ Users can view their own forms (any status)
- ✅ ADMIN/COLLEGE_ORG/COURSE_ORG can view all forms

**INSERT (Create Forms):**
- ✅ Only ADMIN, COLLEGE_ORG, COURSE_ORG can create forms
- ✅ Must set `created_by` to their own user ID

**UPDATE (Edit Forms):**
- ✅ Users can only update their own forms
- ✅ Must be ADMIN, COLLEGE_ORG, or COURSE_ORG role

**DELETE (Remove Forms):**
- ✅ Users can delete their own forms
- ✅ ADMIN can delete any form

---

### 📝 **form_responses** (Responses Table)

**SELECT (View Responses):**
- ✅ Users can view their own responses
- ✅ Form creators can view all responses to their forms
- ✅ ADMIN can view all responses

**INSERT (Submit Responses):**
- ✅ Authenticated users can submit (respondent_id = auth.uid())
- ✅ Anonymous users can submit (respondent_id = NULL)
- ✅ Based on form settings (require_login)

**UPDATE:**
- ❌ **IMMUTABLE** - No one can update responses (prevents cheating)

**DELETE:**
- ✅ Only ADMIN can delete responses

---

### 📊 **form_analytics** (Statistics Cache)

**SELECT (View Statistics):**
- ✅ Form creators can view analytics for their forms
- ✅ ADMIN can view all analytics

**INSERT/UPDATE:**
- ❌ Only service_role (system) can insert/update
- ❌ Regular users cannot modify analytics

**DELETE:**
- ✅ Only ADMIN can delete analytics records

---

### 📑 **form_sections** (Form Sections Table)

**SELECT (View Sections):**
- ✅ Anyone can view sections of published forms
- ✅ Users can view sections of their own forms
- ✅ ADMIN can view all sections

**INSERT (Add Sections):**
- ✅ Form creators can add sections to their forms

**UPDATE (Edit Sections):**
- ✅ Form creators can edit sections in their forms

**DELETE (Remove Sections):**
- ✅ Form creators can delete sections from their forms

---

## How to Apply

### Step 1: Run the Migration
```bash
psql -U your_user -d your_database -f enable_rls_forms_system.sql
```

### Step 2: Verify RLS is Enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('evaluation_forms', 'form_responses', 'form_analytics', 'form_sections');
```

**Expected Output:** All tables should show `rowsecurity = true`

### Step 3: Verify Policies Exist
```sql
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('evaluation_forms', 'form_responses', 'form_analytics', 'form_sections')
ORDER BY tablename, policyname;
```

**Expected Output:** Should show 16 policies (4 per table for SELECT, INSERT, UPDATE, DELETE)

---

## Impact on Existing Code

### ✅ **No Code Changes Needed!**
Your API routes use `supabaseAdmin` client which bypasses RLS, so all existing functionality will continue to work exactly as before.

```typescript
// This still works - admin client bypasses RLS
const { data } = await supabaseAdmin
  .from('evaluation_forms')
  .select('*')
```

### 🔒 **What Changed:**
- **Direct database access** now respects user permissions
- **PostgREST API** calls now enforce RLS policies
- **Client-side queries** (if any) now restricted by role
- **Unauthorized access attempts** now blocked at database level

---

## Testing the Security

### Test 1: Anonymous User Can't Create Forms
```sql
-- Should FAIL
SET ROLE anon;
INSERT INTO evaluation_forms (title, description) 
VALUES ('Test Form', 'Should fail');
```

### Test 2: Student Can View Published Forms
```sql
-- Should SUCCEED for published forms only
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "student-user-id", "role": "STUDENT"}';
SELECT * FROM evaluation_forms WHERE status = 'PUBLISHED';
```

### Test 3: Form Creator Can Update Own Forms
```sql
-- Should SUCCEED if user is creator
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "creator-user-id", "role": "COLLEGE_ORG"}';
UPDATE evaluation_forms SET title = 'Updated' WHERE created_by = 'creator-user-id';
```

### Test 4: Users Can't Update Others' Forms
```sql
-- Should FAIL
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-a", "role": "COLLEGE_ORG"}';
UPDATE evaluation_forms SET title = 'Hacked' WHERE created_by = 'user-b';
```

---

## Security Benefits

### Before RLS:
❌ Anyone could read all forms (including drafts)  
❌ Anyone could modify or delete any form  
❌ Anyone could see all responses  
❌ No audit trail for unauthorized access  
❌ Potential data breaches  

### After RLS:
✅ Role-based access control enforced at database level  
✅ Users can only access their own data  
✅ ADMIN has oversight capabilities  
✅ Anonymous responses still possible (by design)  
✅ Immutable responses prevent tampering  
✅ Multi-layer security (API + Database)  

---

## Maintenance

### Adding New Roles
If you add new roles, update the policies:

```sql
-- Example: Add new DEPARTMENT_ORG role
CREATE POLICY "evaluation_forms_insert_policy" ON evaluation_forms
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG', 'DEPARTMENT_ORG') -- Added here
    )
  );
```

### Monitoring Access
Enable PostgreSQL query logging to monitor RLS denials:

```sql
-- Enable logging
ALTER DATABASE your_database SET log_statement = 'all';
ALTER DATABASE your_database SET log_duration = on;
```

---

## Troubleshooting

### Issue: "permission denied for table"
**Cause:** User doesn't have GRANT permissions  
**Fix:** Run the GRANT statements in the migration script

### Issue: "new row violates row-level security policy"
**Cause:** Trying to insert data that doesn't match policy conditions  
**Fix:** Ensure `created_by` is set correctly and user has appropriate role

### Issue: API routes stop working
**Cause:** Using regular Supabase client instead of admin client  
**Fix:** Ensure API routes use `supabaseAdmin` not `supabase`

```typescript
// ❌ Wrong - subject to RLS
import { supabase } from '@/lib/supabase'

// ✅ Correct - bypasses RLS
import { supabaseAdmin } from '@/lib/supabase-admin'
```

---

## Summary

✅ **Fixed:** All 4 critical RLS security errors  
✅ **Created:** 16 secure policies covering all operations  
✅ **Protected:** Forms, responses, analytics, and sections  
✅ **Maintained:** Backward compatibility with existing code  
✅ **Zero Downtime:** No application changes required  

**Your forms system is now secure! 🔒**

