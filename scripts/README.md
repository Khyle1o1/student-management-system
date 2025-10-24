# Scripts Directory

This directory contains utility scripts for managing your Student Management System.

## 📁 Available Scripts

### Student Data Upload Scripts

#### `upload-students.js`
**Purpose**: Bulk upload student data from CSV to Supabase

**Usage**:
```bash
node scripts/upload-students.js data/my-students.csv
```

**Features**:
- ✅ Validates student data before upload
- ✅ Skips duplicates automatically
- ✅ Creates both user and student records
- ✅ Provides detailed progress and error reporting
- ✅ Safe rollback on errors

---

#### `test-upload.js`
**Purpose**: Test Supabase connection and upload functionality

**Usage**:
```bash
node scripts/test-upload.js
```

**What it does**:
1. Tests database connection
2. Creates a test student
3. Verifies the upload works
4. Cleans up test data
5. Reports success/failure

---

### Database Maintenance Scripts

#### `clear-sample-data-safe.sql`
**Purpose**: Remove ONLY the sample data from `schema.sql`

**Usage**: Run in Supabase SQL Editor

**What it removes**:
- student1@example.com
- student2@example.com
- admin@example.com

**Safe**: Won't delete your real student data

---

#### `clear-sample-data.sql`
**Purpose**: Remove ALL student data from database

**Usage**: Run in Supabase SQL Editor

⚠️ **WARNING**: This deletes ALL students, not just samples. Use with extreme caution!

**What it removes**:
- All students
- All student user accounts
- All attendance records
- All payment records
- All certificate evaluations

---

### Other Scripts

#### `deploy.sh` / `deploy.bat`
**Purpose**: Deployment scripts for production

**Usage**:
```bash
# Linux/Mac
./scripts/deploy.sh

# Windows
scripts\deploy.bat
```

---

#### `test-attendance-fix.js`
**Purpose**: Test attendance system functionality

---

#### `test-oauth-setup.js`
**Purpose**: Verify Google OAuth configuration

---

#### `test-timezone-fix.js`
**Purpose**: Test timezone handling

---

## 📚 Documentation

For detailed instructions on uploading student data:

- **Quick Start (5 min)**: [QUICK_UPLOAD_GUIDE.md](../QUICK_UPLOAD_GUIDE.md)
- **Complete Guide**: [REAL_STUDENT_DATA_UPLOAD_GUIDE.md](../REAL_STUDENT_DATA_UPLOAD_GUIDE.md)

---

## 🔐 Security Notes

- Keep your Supabase service role key secure
- Never commit `.env.local` to Git
- Test scripts with small datasets first
- Always backup before running database scripts

---

## 🆘 Need Help?

1. Check the error message carefully
2. Verify your environment variables are set
3. Ensure you have the correct permissions
4. Review the documentation guides
5. Check Supabase dashboard logs for details

