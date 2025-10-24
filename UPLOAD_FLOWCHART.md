# 📊 Student Data Upload Process Flowchart

Visual guide to understand how the upload process works.

---

## 🗺️ Upload Methods Overview

```
┌─────────────────────────────────────────────────────┐
│         Choose Your Upload Method                   │
└─────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐      ┌────────┐     ┌────────┐
    │ Method │      │ Method │     │ Method │
    │   1    │      │   2    │     │   3    │
    │  CSV   │      │  SQL   │     │   UI   │
    │ Upload │      │ Direct │     │ Batch  │
    └────────┘      └────────┘     └────────┘
        │               │               │
        ▼               ▼               ▼
   Automated        Manual          Web-based
   Fast (100+)      Small sets      Non-tech
   Recommended      Full control    Visual
```

---

## 📋 Method 1: CSV Upload Process (Recommended)

```
START
  │
  ▼
┌─────────────────────────────────────┐
│ 1. PREREQUISITES                    │
├─────────────────────────────────────┤
│ ✓ Supabase project created         │
│ ✓ schema.sql executed              │
│ ✓ .env.local configured            │
│ ✓ npm install completed            │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 2. TEST CONNECTION                  │
├─────────────────────────────────────┤
│ $ node scripts/test-upload.js      │
│                                     │
│ ✅ Connection successful?           │
└─────────────────────────────────────┘
  │
  ├─── NO ──→ Fix credentials ──┐
  │                              │
  YES                            │
  │                              │
  ▼                              │
┌─────────────────────────────────────┐
│ 3. PREPARE CSV FILE                 │
├─────────────────────────────────────┤
│ • Copy template:                    │
│   data/students-template.csv       │
│                                     │
│ • Fill with real data:             │
│   name, email, studentId,          │
│   college, yearLevel, course       │
│                                     │
│ • Save as:                         │
│   data/my-students.csv             │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 4. OPTIONAL: CLEAR SAMPLE DATA      │
├─────────────────────────────────────┤
│ Run in Supabase SQL Editor:        │
│ clear-sample-data-safe.sql         │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 5. RUN UPLOAD SCRIPT                │
├─────────────────────────────────────┤
│ $ node scripts/upload-students.js  │
│   data/my-students.csv             │
│                                     │
│ Processing...                       │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 6. REVIEW RESULTS                   │
├─────────────────────────────────────┤
│ ✅ Successful: 148                  │
│ ⚠️  Skipped: 2 (duplicates)         │
│ ❌ Failed: 0                        │
│ 📊 Total: 150                       │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 7. VERIFY IN SUPABASE               │
├─────────────────────────────────────┤
│ • Table Editor → users             │
│ • Table Editor → students          │
│ • Check counts match               │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ 8. TEST LOGIN                       │
├─────────────────────────────────────┤
│ • Log in as a student              │
│ • Verify profile loads             │
│ • Check data is correct            │
└─────────────────────────────────────┘
  │
  ▼
SUCCESS! ✨
```

---

## 🔄 How the Upload Script Works

```
For Each Student in CSV:
  │
  ▼
┌─────────────────────────────────┐
│ VALIDATE DATA                   │
├─────────────────────────────────┤
│ • Name required?                │
│ • Email valid?                  │
│ • Student ID unique?            │
│ • Year level valid?             │
│ • All required fields present?  │
└─────────────────────────────────┘
  │
  ├─── INVALID ──→ Skip & Log Error
  │
  VALID
  │
  ▼
┌─────────────────────────────────┐
│ CHECK DUPLICATES                │
├─────────────────────────────────┤
│ • Email exists in users?        │
│ • Student ID exists?            │
└─────────────────────────────────┘
  │
  ├─── EXISTS ──→ Skip & Log Warning
  │
  NEW
  │
  ▼
┌─────────────────────────────────┐
│ CREATE USER RECORD              │
├─────────────────────────────────┤
│ • Hash password                 │
│ • Insert into users table       │
│ • Role = 'STUDENT'              │
└─────────────────────────────────┘
  │
  ├─── FAILED ──→ Log Error & Continue
  │
  SUCCESS
  │
  ▼
┌─────────────────────────────────┐
│ CREATE STUDENT RECORD           │
├─────────────────────────────────┤
│ • Link to user_id               │
│ • Insert into students table    │
│ • Store student details         │
└─────────────────────────────────┘
  │
  ├─── FAILED ──→ Rollback user, Log Error
  │
  SUCCESS
  │
  ▼
┌─────────────────────────────────┐
│ ✅ Student Created Successfully │
└─────────────────────────────────┘
  │
  ▼
Next Student...
```

---

## 🗄️ Database Structure

```
┌──────────────────────────┐
│       users table        │
├──────────────────────────┤
│ id (UUID, PK)            │
│ email (unique)           │
│ password (hashed)        │
│ name                     │
│ role = 'STUDENT'         │
│ created_at               │
└──────────────────────────┘
           │
           │ ONE-TO-ONE
           │
           ▼
┌──────────────────────────┐
│     students table       │
├──────────────────────────┤
│ id (UUID, PK)            │
│ user_id (FK) ───────────►│
│ student_id (unique)      │
│ name                     │
│ email                    │
│ phone                    │
│ college                  │
│ year_level (1-4)         │
│ course                   │
│ created_at               │
│ updated_at               │
└──────────────────────────┘
           │
           │ ONE-TO-MANY
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│attendance│  │ payments │
└─────────┘  └──────────┘
```

---

## 📁 CSV File Structure

```
┌─────────────────────────────────────────────────────────┐
│                  my-students.csv                        │
├─────────────────────────────────────────────────────────┤
│ HEADER ROW                                              │
│ name,email,studentId,college,yearLevel,course,phone,... │
├─────────────────────────────────────────────────────────┤
│ DATA ROW 1                                              │
│ Juan Cruz,juan@...,2024001,Tech,YEAR_1,CS,09171...     │
├─────────────────────────────────────────────────────────┤
│ DATA ROW 2                                              │
│ Maria Santos,maria@...,2024002,Eng,YEAR_2,Civil,0918.. │
├─────────────────────────────────────────────────────────┤
│ ...more rows...                                         │
└─────────────────────────────────────────────────────────┘

Required Columns:
  ✓ name
  ✓ email
  ✓ studentId
  ✓ college
  ✓ yearLevel
  ✓ course

Optional Columns:
  • phone
  • password
```

---

## ⚠️ Error Handling Flow

```
Upload Process
  │
  ▼
Error Occurs?
  │
  ├─── NO ──→ Continue
  │
  YES
  │
  ▼
What Type?
  │
  ├──→ Validation Error
  │     │
  │     ├─ Log error details
  │     ├─ Skip this student
  │     └─ Continue with next
  │
  ├──→ Duplicate Found
  │     │
  │     ├─ Log as "skipped"
  │     ├─ Don't create record
  │     └─ Continue with next
  │
  ├──→ User Creation Failed
  │     │
  │     ├─ Log error
  │     ├─ Skip this student
  │     └─ Continue with next
  │
  └──→ Student Creation Failed
        │
        ├─ Rollback user creation
        ├─ Log error
        ├─ Skip this student
        └─ Continue with next
```

---

## 🎯 Decision Tree: Which Method to Use?

```
How many students?
  │
  ├──→ 1-10 students
  │     │
  │     ├──→ Comfortable with code?
  │     │     YES → CSV Upload
  │     │     NO → UI Batch Import
  │     │
  │
  ├──→ 10-100 students
  │     │
  │     └──→ CSV Upload (Recommended)
  │
  │
  └──→ 100+ students
        │
        └──→ CSV Upload (Best option)


Need full control over SQL?
  │
  YES → Direct SQL Method
  │
  NO → CSV Upload


Non-technical user?
  │
  YES → UI Batch Import
  │
  NO → CSV Upload (fastest)
```

---

## ✅ Success Verification Checklist

```
After Upload:

□ Check Supabase Dashboard
  └─ Table Editor
      ├─ users table shows new students
      └─ students table shows records

□ Verify Counts
  └─ SELECT COUNT(*) FROM students
      └─ Should match CSV row count

□ Test Login
  └─ Use a student email/password
      └─ Should successfully log in

□ Check Dashboard
  └─ Student list shows all records
      └─ Data displays correctly

□ Test Features
  └─ View student profile
  └─ Check attendance
  └─ Verify payments (if applicable)
```

---

## 🚨 Common Error Paths

```
Error: "Supabase credentials not found"
  │
  └──→ Solution:
        1. Check .env.local exists
        2. Verify SUPABASE_SERVICE_ROLE_KEY set
        3. Restart terminal
        4. Retry


Error: "Email already exists"
  │
  └──→ Solution:
        1. Check for duplicates in CSV
        2. Query: SELECT * FROM users WHERE email = '...'
        3. Remove/update duplicate
        4. Retry


Error: "Student ID already exists"
  │
  └──→ Solution:
        1. Check for duplicates in CSV
        2. Query: SELECT * FROM students WHERE student_id = '...'
        3. Update to unique ID
        4. Retry


Error: "Invalid year level"
  │
  └──→ Solution:
        1. Use YEAR_1, YEAR_2, YEAR_3, or YEAR_4
        2. Check case (must be uppercase)
        3. Fix in CSV
        4. Retry
```

---

## 📊 Summary Timeline

```
Total Time Estimate:

Setup (First Time Only)      : 10 minutes
  ├─ Get Supabase key        : 2 min
  ├─ Update .env.local       : 1 min
  ├─ Test connection         : 2 min
  └─ Prepare CSV template    : 5 min

Prepare Data                 : 15-30 minutes
  ├─ Collect student data    : varies
  ├─ Format as CSV           : 10 min
  └─ Validate data           : 5 min

Upload & Verify              : 5-10 minutes
  ├─ Run upload script       : 2-5 min (depends on count)
  ├─ Review results          : 2 min
  └─ Verify in Supabase      : 1-3 min

──────────────────────────────
Total (first time)           : 30-50 minutes
Total (subsequent)           : 20-40 minutes
```

---

## 🎓 Understanding Year Levels

```
Input Value    →    Stored As    →    Displayed As
───────────────────────────────────────────────────
YEAR_1         →        1         →      1st Year
YEAR_2         →        2         →      2nd Year
YEAR_3         →        3         →      3rd Year
YEAR_4         →        4         →      4th Year

Also Accepted:
1              →        1         →      1st Year
2              →        2         →      2nd Year
3              →        3         →      3rd Year
4              →        4         →      4th Year
```

---

**Need more details?** See:
- [QUICK_UPLOAD_GUIDE.md](./QUICK_UPLOAD_GUIDE.md) for quick start
- [REAL_STUDENT_DATA_UPLOAD_GUIDE.md](./REAL_STUDENT_DATA_UPLOAD_GUIDE.md) for complete guide

