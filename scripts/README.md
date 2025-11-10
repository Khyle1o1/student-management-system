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

### Forms & Evaluations

#### `seed-form-responses.ts`
**Purpose**: Generate realistic sample responses for a published evaluation form so you can preview statistics and charts.

**Usage**:
```bash
npx tsx scripts/seed-form-responses.ts --form=b7d64efa-9105-4177-a30b-5775d9c08520 --count=30
```

**Options**:
- `--form=<uuid>` — Target form ID (required)
- `--count=<number>` — Number of synthetic responses to create (default: 25)
- `--base=<url>` — API base URL (default: `http://localhost:3000`)
- `--dry-run` — Print generated payloads without submitting them
- `--delay=<ms>` — Delay between submissions (default: 120ms, set to 0 for faster seeding)

> ℹ️ Make sure the form status is **Published** and the dev server (`npm run dev`) is running before executing the script.

---

#### `seed-event-with-data.ts`
**Purpose**: Stand up a full dummy event with thousands of attendance records and (optionally) evaluation form responses for load-testing dashboards.

**Usage**:
```bash
npx tsx scripts/seed-event-with-data.ts --form=b7d64efa-9105-4177-a30b-5775d9c08520 --attendees=2000 --responses=2000
```

**Options**:
- `--form=<uuid>` — Link responses to this evaluation form (optional but recommended)
- `--event=<uuid>` — Use an existing event instead of creating a new one
- `--title="Dummy Event"` — Custom title when creating a new event
- `--attendees=<number>` — Attendance rows to generate (default: 500)
- `--responses=<number>` — Form responses to generate (default: equals attendees)
- `--students=<number>` — Ensure the student pool has at least this many records (default: max(attendees, responses))
- `--dry-run` — Preview the work without touching the database

> 🛡️ Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your environment. The script uses direct Supabase inserts, so you don’t need the dev server running.

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

