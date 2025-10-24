# 🗑️ Clear Database Instructions

Follow these steps to clear your current student data.

---

## 🎯 Option 1: Safe Clear (Recommended)

**What it does:** Removes only the sample data from `schema.sql`

**What it removes:**
- student1@example.com
- student2@example.com  
- admin@example.com
- Student IDs: STU001, STU002

**What it keeps:** Any other students you've added

### SQL to Run:

```sql
-- Safe Clear Sample Data Script
BEGIN;

-- Delete sample students (from schema.sql)
DELETE FROM students 
WHERE student_id IN ('STU001', 'STU002');

-- Delete sample users (from schema.sql)
DELETE FROM users 
WHERE email IN ('student1@example.com', 'student2@example.com', 'admin@example.com');

-- Display remaining counts
SELECT 'Remaining data:' as info;
SELECT 'Students:' as table_name, COUNT(*) as count FROM students;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users;

COMMIT;

SELECT '✅ Sample data from schema.sql removed!' as result;
```

---

## 🎯 Option 2: Clear ALL Students ⚠️

**What it does:** Removes ALL student data

**What it removes:**
- ALL students
- ALL student user accounts
- ALL attendance records
- ALL payment records
- ALL certificate evaluations

**What it keeps:** 
- Admin accounts
- Events
- Fee structures

### SQL to Run:

```sql
-- Clear ALL Student Data
-- USE WITH CAUTION!
BEGIN;

-- Display counts before deletion
SELECT 'Current counts:' as info;
SELECT 'Students:' as table_name, COUNT(*) as count FROM students;
SELECT 'Users (Students):' as table_name, COUNT(*) as count FROM users WHERE role = 'STUDENT';
SELECT 'Attendance:' as table_name, COUNT(*) as count FROM attendance;
SELECT 'Payments:' as table_name, COUNT(*) as count FROM payments;

-- Delete attendance records
DELETE FROM attendance 
WHERE student_id IN (SELECT id FROM students);

-- Delete payment records
DELETE FROM payments 
WHERE student_id IN (SELECT id FROM students);

-- Delete certificate evaluations (if exists)
DELETE FROM certificate_evaluations 
WHERE student_id IN (SELECT id FROM students);

-- Delete students
DELETE FROM students;

-- Delete student user accounts (keep admin accounts)
DELETE FROM users 
WHERE role = 'STUDENT';

-- Display counts after deletion
SELECT 'Counts after deletion:' as info;
SELECT 'Students:' as table_name, COUNT(*) as count FROM students;
SELECT 'Users (Students):' as table_name, COUNT(*) as count FROM users WHERE role = 'STUDENT';
SELECT 'Attendance:' as table_name, COUNT(*) as count FROM attendance;
SELECT 'Payments:' as table_name, COUNT(*) as count FROM payments;

COMMIT;

SELECT '✅ Sample data cleared successfully! You can now upload real student data.' as result;
```

---

## 📋 Step-by-Step Process

### 1. Backup First (Important!)

Go to Supabase Dashboard → Database → Backups → Create Backup

### 2. Open SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New query**

### 3. Paste SQL

Copy the SQL from either Option 1 or Option 2 above and paste it into the SQL Editor

### 4. Review the SQL

Make sure you selected the right option:
- **Option 1** = Only removes STU001, STU002, sample users
- **Option 2** = Removes ALL students

### 5. Run the Query

Click **Run** button (or press Ctrl+Enter)

### 6. Review Results

The script will show you:
- **Before deletion counts** - How many records existed
- **After deletion counts** - How many remain
- **Success message** - Confirmation

### 7. Verify in Table Editor

1. Go to **Table Editor** → **students**
2. Verify the data looks correct
3. Check **users** table as well

---

## ✅ After Clearing Data

Once your database is cleared, you can upload real student data:

```bash
# Test connection
node scripts/test-upload.js

# Upload your real data
node scripts/upload-students.js data/my-students.csv
```

See [QUICK_UPLOAD_GUIDE.md](./QUICK_UPLOAD_GUIDE.md) for complete upload instructions.

---

## 🆘 Troubleshooting

### "Error: relation does not exist"
Some tables might not exist yet. That's okay, the script will skip them.

### "Rows affected: 0"
No matching data was found. This is normal if data was already cleared.

### Need to Undo?
If you haven't closed the SQL Editor:
1. Type `ROLLBACK;`
2. Click Run

If you already committed:
- Restore from your backup (Supabase Dashboard → Database → Backups)

---

## 🔒 Safety Notes

- ✅ The scripts use transactions (BEGIN/COMMIT)
- ✅ They show counts before and after
- ✅ They preserve admin accounts
- ✅ They handle related records (attendance, payments)

---

## 🎯 Which Option Should I Choose?

### Choose Option 1 (Safe) if:
- ✓ You only want to remove the sample/test data
- ✓ You've already added some students and want to keep them
- ✓ You're not sure what's in the database

### Choose Option 2 (Clear All) if:
- ✓ You want a completely fresh start
- ✓ You want to remove ALL students
- ✓ You're starting with a clean slate for production data

---

**Still unsure?** Start with **Option 1 (Safe)** - you can always run Option 2 later if needed!

