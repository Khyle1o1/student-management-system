# Real Student Data Upload Guide

This guide will help you replace the sample/test student data with real student data by uploading directly to your Supabase database.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Method 1: Using CSV Upload Script (Recommended)](#method-1-using-csv-upload-script-recommended)
3. [Method 2: Direct SQL Upload](#method-2-direct-sql-upload)
4. [Method 3: Using the Batch Import UI](#method-3-using-the-batch-import-ui)
5. [Data Format Requirements](#data-format-requirements)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before uploading real student data:

1. **Backup your database** (important!)
2. Ensure you have your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. Install required dependencies:
   ```bash
   npm install
   ```

---

## Method 1: Using CSV Upload Script (Recommended)

This is the **fastest and most reliable** method for bulk uploading students.

### Step 1: Clear Existing Sample Data (Optional)

If you want to remove the sample data from `schema.sql`:

**Option A: Clear ONLY sample data (Safe)**
```bash
# In Supabase SQL Editor, run:
scripts/clear-sample-data-safe.sql
```

**Option B: Clear ALL student data (Use with caution)**
```bash
# In Supabase SQL Editor, run:
scripts/clear-sample-data.sql
```

### Step 2: Prepare Your CSV File

1. Use the provided template as a starting point:
   ```
   data/students-template.csv
   ```

2. Required columns:
   - `name` - Full name of the student
   - `email` - Email address (must be unique)
   - `studentId` - Student ID number (numeric, must be unique)
   - `college` - College name
   - `yearLevel` - Year level (YEAR_1, YEAR_2, YEAR_3, YEAR_4, or 1, 2, 3, 4)
   - `course` - Course/Program name

3. Optional columns:
   - `phone` - Phone number
   - `password` - Default password (if not provided, will use `student{studentId}`)

### Step 3: Create Your CSV File

Create a file `data/my-students.csv` with your real student data:

```csv
name,email,studentId,college,yearLevel,course,phone,password
John Doe,john.doe@student.buksu.edu.ph,2024001,College of Technology,YEAR_1,Computer Science,09171234567,student2024
Jane Smith,jane.smith@student.buksu.edu.ph,2024002,College of Engineering,YEAR_2,Civil Engineering,09181234567,student2024
```

### Step 4: Run the Upload Script

```bash
node scripts/upload-students.js data/my-students.csv
```

### Step 5: Review Results

The script will output:
- ✅ Successfully created students
- ⚠️ Skipped students (duplicates)
- ❌ Failed students (with error details)
- 📊 Summary statistics

Example output:
```
🚀 Student Data Upload Script
================================

📁 Reading CSV file: data/my-students.csv
✅ Parsed 150 students from CSV

📊 Processing 150 students...

✅ Row 2: Successfully created student John Doe (2024001)
✅ Row 3: Successfully created student Jane Smith (2024002)
...

================================
📈 Upload Summary
================================
✅ Successful: 148
⚠️  Skipped: 2
❌ Failed: 0
📊 Total: 150

✨ Upload completed successfully!
```

---

## Method 2: Direct SQL Upload

If you prefer SQL, you can insert students directly.

### Step 1: Create SQL Insert Script

Create a file `scripts/insert-real-students.sql`:

```sql
-- Insert real student users
INSERT INTO users (email, password, name, role) VALUES
  ('john.doe@student.buksu.edu.ph', '$2a$10$...', 'John Doe', 'STUDENT'),
  ('jane.smith@student.buksu.edu.ph', '$2a$10$...', 'Jane Smith', 'STUDENT');

-- Insert real student records
INSERT INTO students (user_id, student_id, name, email, college, year_level, course, phone) VALUES
  ((SELECT id FROM users WHERE email = 'john.doe@student.buksu.edu.ph'), '2024001', 'John Doe', 'john.doe@student.buksu.edu.ph', 'College of Technology', 1, 'Computer Science', '09171234567'),
  ((SELECT id FROM users WHERE email = 'jane.smith@student.buksu.edu.ph'), '2024002', 'Jane Smith', 'jane.smith@student.buksu.edu.ph', 'College of Engineering', 2, 'Civil Engineering', '09181234567');
```

**Note:** You'll need to hash passwords using bcrypt. Use this Node.js snippet:

```javascript
const bcrypt = require('bcryptjs');
const password = 'student2024';
bcrypt.hash(password, 10).then(hash => console.log(hash));
```

### Step 2: Run in Supabase SQL Editor

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Paste your SQL script
4. Click **Run**

---

## Method 3: Using the Batch Import UI

You can use the built-in batch import feature in the dashboard:

### Step 1: Access Batch Import

1. Log in as an admin
2. Navigate to **Dashboard → Students**
3. Click **"Batch Import"** button

### Step 2: Prepare Your File

Use either CSV or Excel format with these columns:
- name
- email
- studentId
- yearLevel (YEAR_1, YEAR_2, YEAR_3, YEAR_4)
- course
- college
- password (optional)

### Step 3: Upload

1. Click **"Choose File"** or drag and drop
2. Review the preview
3. Click **"Import Students"**
4. Wait for the process to complete

### Step 4: Review Results

The system will show:
- Number of successful imports
- Any failed imports with reasons
- Duplicate entries that were skipped

---

## Data Format Requirements

### Student ID Format
- **Must be numeric only** (e.g., `2024001`, `2024002`)
- **Must be unique** across all students
- No letters or special characters

### Year Level Format
Use one of these formats:
- `YEAR_1`, `YEAR_2`, `YEAR_3`, `YEAR_4` (recommended)
- `1`, `2`, `3`, `4` (also accepted)

**Mapping:**
| Input | Database Value | Display |
|-------|----------------|---------|
| YEAR_1 or 1 | 1 | 1st Year |
| YEAR_2 or 2 | 2 | 2nd Year |
| YEAR_3 or 3 | 3 | 3rd Year |
| YEAR_4 or 4 | 4 | 4th Year |

### Email Format
- Must be a valid email address
- Should match your institution's domain
- Must be unique across all students
- Examples:
  - `john.doe@student.buksu.edu.ph`
  - `jane.smith@student.university.edu`

### College Names
Use your institution's official college names. Examples:
- College of Technology
- College of Engineering
- College of Business Administration
- College of Arts and Sciences
- College of Education

### Course Names
Use the full course/program names. Examples:
- Computer Science
- Information Technology
- Civil Engineering
- Business Administration
- Psychology

---

## Troubleshooting

### Error: "Email already exists"
**Solution:** Each email must be unique. Check for duplicates in your CSV file or database.

### Error: "Student ID already exists"
**Solution:** Each student ID must be unique. Check for duplicates in your CSV file.

### Error: "Invalid year level"
**Solution:** Use only YEAR_1, YEAR_2, YEAR_3, YEAR_4, or 1, 2, 3, 4.

### Error: "Supabase credentials not found"
**Solution:** Ensure your `.env.local` file has the correct Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Error: "Failed to create user"
**Possible causes:**
1. Database connection issue
2. Invalid email format
3. Supabase RLS (Row Level Security) policy blocking insert

**Solution:** 
- Check Supabase dashboard for error details
- Verify your service role key has proper permissions
- Temporarily disable RLS for testing (not recommended for production)

### Script is Slow
**Solution:** 
- The script processes students one at a time to ensure data integrity
- For very large datasets (1000+ students), consider:
  1. Breaking the CSV into smaller chunks
  2. Running multiple uploads in parallel
  3. Using Supabase's bulk insert API

### How to Verify Upload Success

After uploading, verify in Supabase:

1. Go to **Table Editor**
2. Check `users` table - you should see new STUDENT role users
3. Check `students` table - you should see corresponding student records
4. Verify the counts match your CSV file

---

## Best Practices

### 1. Start Small
- Test with 5-10 students first
- Verify everything works correctly
- Then upload the full dataset

### 2. Data Validation
- Clean your data before uploading
- Remove duplicate emails and student IDs
- Ensure consistent formatting

### 3. Backup Before Upload
- Always backup your database first
- You can rollback if something goes wrong

### 4. Password Strategy
- Use a default password for all students (e.g., `student2024`)
- Send password reset emails after upload
- Or allow students to set passwords on first login

### 5. Error Handling
- The script will skip duplicates automatically
- Failed rows are reported with specific errors
- You can re-run the script - it won't create duplicates

---

## Example Workflow

Here's a complete example workflow:

```bash
# 1. Backup your database (in Supabase dashboard)

# 2. Clear sample data (optional)
# Run in Supabase SQL Editor: scripts/clear-sample-data-safe.sql

# 3. Prepare your CSV file
# Copy data/students-template.csv to data/my-students.csv
# Fill in with your real student data

# 4. Test with a small batch first
# Create data/test-students.csv with 5 students
node scripts/upload-students.js data/test-students.csv

# 5. Verify in Supabase dashboard
# Check that students appear correctly

# 6. Upload full dataset
node scripts/upload-students.js data/my-students.csv

# 7. Verify the upload
# Check student count and sample some records

# 8. Done! 🎉
```

---

## Need Help?

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the error messages carefully
3. Verify your CSV format matches the template
4. Check Supabase logs in the dashboard
5. Ensure all required environment variables are set

---

## Security Notes

- Never commit your `.env.local` file to Git
- Keep your service role key secure
- Use strong default passwords
- Consider implementing password reset flow
- Enable Row Level Security (RLS) policies in production

---

**Happy uploading! 🚀**

