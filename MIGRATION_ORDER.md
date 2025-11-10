# Database Migration Order - Complete Guide

## ⚠️ CRITICAL: Run These Migrations IN ORDER!

This guide shows you **exactly which SQL files to run** and **in what order** to complete the migration from the old evaluations system to the new forms system.

---

## 📋 **Migration Checklist**

### ✅ **Step 1: Create New Forms System Tables**
**File:** `evaluation_forms_system_migration.sql`

**What it does:**
- Creates `evaluation_forms` table (new forms)
- Creates `form_responses` table (new responses)
- Creates `form_analytics` table (statistics cache)
- Creates `form_sections` table (form sections)
- Creates indexes for performance

**Run:**
```bash
psql -U your_user -d your_database -f evaluation_forms_system_migration.sql
```

**Status:** ⬜ Not Run | ✅ Complete

---

### ✅ **Step 2: Add Sections Column (If Already Created Tables)**
**File:** `add_sections_column.sql`

**What it does:**
- Adds `sections` JSONB column to `evaluation_forms` table
- Only needed if you ran the initial migration before sections were added

**Run:**
```bash
psql -U your_user -d your_database -f add_sections_column.sql
```

**Status:** ⬜ Not Run | ✅ Complete | ⏭️ Skip (if already has sections)

---

### ✅ **Step 3: Add evaluation_id to Events Table**
**File:** `add_evaluation_id_to_events.sql` ⚠️ **MUST RUN THIS!**

**What it does:**
- Adds `evaluation_id` column to `events` table
- Links events to new forms system
- Migrates data from old `event_evaluations` table (if it exists)

**Run:**
```bash
psql -U your_user -d your_database -f add_evaluation_id_to_events.sql
```

**Status:** ⬜ Not Run | ✅ Complete

**⚠️ THIS IS CAUSING YOUR CURRENT ERROR!**
```
Error: column events.evaluation_id does not exist
```

---

### ✅ **Step 4: Enable Row Level Security**
**File:** `enable_rls_forms_system.sql`

**What it does:**
- Enables RLS on all 4 forms system tables
- Creates 16 security policies
- Grants proper permissions

**Run:**
```bash
psql -U your_user -d your_database -f enable_rls_forms_system.sql
```

**Status:** ⬜ Not Run | ✅ Complete

---

### ✅ **Step 5: Remove Old System (Optional but Recommended)**
**File:** `remove_old_evaluations_system.sql`

**What it does:**
- Drops `evaluations` table
- Drops `evaluation_responses` table
- Drops `event_evaluations` table

**⚠️ WARNING:** This permanently deletes old evaluation data!

**Backup first:**
```sql
-- Backup old data before dropping
SELECT * INTO evaluations_backup FROM evaluations;
SELECT * INTO evaluation_responses_backup FROM evaluation_responses;
SELECT * INTO event_evaluations_backup FROM event_evaluations;
```

**Run:**
```bash
psql -U your_user -d your_database -f remove_old_evaluations_system.sql
```

**Status:** ⬜ Not Run | ✅ Complete | ⏭️ Skip (keep old tables for now)

---

## 🚨 **Quick Fix for Current Error**

Your current error is:
```
column events.evaluation_id does not exist
```

**Solution: Run Step 3 NOW!**
```bash
psql -U your_user -d your_database -f add_evaluation_id_to_events.sql
```

This will immediately fix your error! 🎯

---

## 📊 **Migration Status Check**

After running migrations, verify everything is set up correctly:

```sql
-- 1. Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('evaluation_forms', 'form_responses', 'form_analytics', 'form_sections')
ORDER BY table_name;
-- Expected: 4 rows

-- 2. Check events.evaluation_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'evaluation_id';
-- Expected: 1 row showing UUID type

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('evaluation_forms', 'form_responses', 'form_analytics', 'form_sections');
-- Expected: 4 rows, all with rowsecurity = true

-- 4. Check old tables are gone (if you ran step 5)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('evaluations', 'evaluation_responses', 'event_evaluations');
-- Expected: 0 rows (if old system removed)
```

---

## 🔄 **Complete Migration Order (Recommended)**

```bash
# 1. Create new system
psql -U your_user -d your_database -f evaluation_forms_system_migration.sql

# 2. Add sections support (if needed)
psql -U your_user -d your_database -f add_sections_column.sql

# 3. Link events to new system (CRITICAL - fixes your error!)
psql -U your_user -d your_database -f add_evaluation_id_to_events.sql

# 4. Enable security
psql -U your_user -d your_database -f enable_rls_forms_system.sql

# 5. Remove old system (optional, after backing up)
# Backup first!
# psql -U your_user -d your_database -f remove_old_evaluations_system.sql
```

---

## 📝 **Migration Summary**

| Step | File | Required | Status |
|------|------|----------|--------|
| 1 | `evaluation_forms_system_migration.sql` | ✅ Yes | ⬜ |
| 2 | `add_sections_column.sql` | ⚠️ Maybe | ⬜ |
| 3 | `add_evaluation_id_to_events.sql` | ✅ **CRITICAL** | ⬜ |
| 4 | `enable_rls_forms_system.sql` | ✅ Yes | ⬜ |
| 5 | `remove_old_evaluations_system.sql` | ⏭️ Optional | ⬜ |

---

## 🎯 **What Each File Fixes**

### `evaluation_forms_system_migration.sql`
- Fixes: No forms system tables
- Creates: New forms database structure

### `add_sections_column.sql`
- Fixes: Can't create sections in forms
- Creates: Sections support in forms

### `add_evaluation_id_to_events.sql` ⚠️
- Fixes: **"column events.evaluation_id does not exist" ERROR** ← YOUR CURRENT ERROR!
- Creates: Link between events and evaluation forms

### `enable_rls_forms_system.sql`
- Fixes: RLS security errors
- Creates: Row-level security policies

### `remove_old_evaluations_system.sql`
- Fixes: Database clutter
- Creates: Clean database with only new system

---

## 💡 **Troubleshooting**

### Error: "relation evaluation_forms does not exist"
**Solution:** Run Step 1 first

### Error: "column sections does not exist"
**Solution:** Run Step 2

### Error: "column events.evaluation_id does not exist" ← **YOU ARE HERE**
**Solution:** Run Step 3 - `add_evaluation_id_to_events.sql`

### Error: "RLS disabled in public"
**Solution:** Run Step 4

### Old system still exists
**Solution:** Run Step 5 (after backing up)

---

## ✅ **Success Indicators**

After all migrations, you should see:

✅ Events page loads without errors  
✅ Can create forms with sections  
✅ Can link forms to events  
✅ Can submit form responses  
✅ Can view form statistics  
✅ No RLS security warnings  
✅ Old tables removed (optional)  

---

## 🆘 **Need Help?**

1. **Check which step failed:** Look at the error message
2. **Verify previous steps:** Run the verification queries above
3. **Check migration logs:** Look for NOTICE/ERROR messages in psql output
4. **Rollback if needed:** Restore from backup before that step

---

## 📄 **Summary**

**To fix your current error RIGHT NOW:**
```bash
psql -U your_user -d your_database -f add_evaluation_id_to_events.sql
```

**This single command will fix:**
- ✅ "column events.evaluation_id does not exist" error
- ✅ Events API will work again
- ✅ Can link forms to events
- ✅ Event evaluation flow will work

**Run it now and refresh your page!** 🚀

