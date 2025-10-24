# Quick Upload Guide - Replace Sample Data with Real Students

This is a simplified 5-minute guide to replace sample student data with real students.

## 🚀 Quick Start (5 minutes)

### Step 1: Get Your Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the **service_role** key (secret key)
4. Add it to your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 2: Prepare Your Student Data

Create a CSV file `data/my-students.csv` with your real student data:

```csv
name,email,studentId,college,yearLevel,course,phone,password
Juan Dela Cruz,juan.delacruz@student.buksu.edu.ph,2024001,College of Technology,YEAR_1,Computer Science,09171234567,student2024
Maria Santos,maria.santos@student.buksu.edu.ph,2024002,College of Engineering,YEAR_2,Civil Engineering,09181234567,student2024
```

**Important:**
- `studentId` must be **numbers only** (e.g., 2024001)
- `yearLevel` must be YEAR_1, YEAR_2, YEAR_3, or YEAR_4
- `email` must be unique for each student
- `password` is optional (defaults to `student{studentId}`)

### Step 3: Test Your Connection

```bash
node scripts/test-upload.js
```

You should see:
```
✅ Connection successful!
✅ User created
✅ Student created
✨ All tests passed!
```

### Step 4: Upload Your Data

```bash
node scripts/upload-students.js data/my-students.csv
```

### Step 5: Verify

1. Open Supabase dashboard
2. Go to **Table Editor** → **students**
3. You should see your students listed!

## ✅ Done!

That's it! Your real student data is now in the database.

---

## 📋 CSV Template Reference

Copy this template and fill in your data:

```csv
name,email,studentId,college,yearLevel,course,phone,password
```

### Required Fields:
- **name**: Student's full name
- **email**: Must be unique
- **studentId**: Numbers only, must be unique
- **college**: College name
- **yearLevel**: YEAR_1, YEAR_2, YEAR_3, or YEAR_4
- **course**: Course/program name

### Optional Fields:
- **phone**: Phone number
- **password**: Default password (if blank, uses `student{studentId}`)

---

## 🆘 Common Issues

### "Supabase credentials not found"
→ Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

### "Email already exists"
→ Each email must be unique. Check for duplicates.

### "Student ID already exists"
→ Each student ID must be unique. Check for duplicates.

### "Invalid year level"
→ Use YEAR_1, YEAR_2, YEAR_3, or YEAR_4 (uppercase)

---

## 🔄 Need to Clear Old Data First?

**Option 1: Clear only sample data (safe)**
Run this SQL in Supabase SQL Editor:
```sql
DELETE FROM students WHERE student_id IN ('STU001', 'STU002');
DELETE FROM users WHERE email IN ('student1@example.com', 'student2@example.com');
```

**Option 2: Clear ALL students (use with caution)**
Run: `scripts/clear-sample-data.sql` in Supabase SQL Editor

---

## 📚 Need More Details?

See the complete guide: [REAL_STUDENT_DATA_UPLOAD_GUIDE.md](./REAL_STUDENT_DATA_UPLOAD_GUIDE.md)

---

**Good luck! 🎉**

