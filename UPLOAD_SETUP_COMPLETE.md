# ✅ Upload Setup Complete!

Your Student Management System is now ready to accept real student data!

## 📦 What Was Created

### 1. Upload Scripts
- ✅ `scripts/upload-students.js` - Main upload script
- ✅ `scripts/test-upload.js` - Test your connection

### 2. Data Templates
- ✅ `data/students-template.csv` - Basic template (4 students)
- ✅ `data/students-template-extended.csv` - Extended template (10 students)

### 3. Database Scripts
- ✅ `scripts/clear-sample-data-safe.sql` - Remove only sample data
- ✅ `scripts/clear-sample-data.sql` - Remove all students (use with caution)

### 4. Documentation
- ✅ `QUICK_UPLOAD_GUIDE.md` - 5-minute quick start
- ✅ `REAL_STUDENT_DATA_UPLOAD_GUIDE.md` - Complete detailed guide
- ✅ `scripts/README.md` - Scripts documentation

### 5. Updated Files
- ✅ `README.md` - Added link to upload guides

---

## 🚀 Getting Started (Choose One Method)

### Method 1: CSV Upload (Recommended) ⭐

**Best for**: Bulk uploads, 10+ students

1. Add service role key to `.env.local`
2. Test connection: `node scripts/test-upload.js`
3. Prepare CSV with your data
4. Upload: `node scripts/upload-students.js data/your-file.csv`

📖 Guide: [QUICK_UPLOAD_GUIDE.md](./QUICK_UPLOAD_GUIDE.md)

---

### Method 2: Direct SQL Upload

**Best for**: Small datasets, manual control

1. Create SQL insert statements
2. Hash passwords using bcrypt
3. Run in Supabase SQL Editor

📖 Guide: [REAL_STUDENT_DATA_UPLOAD_GUIDE.md](./REAL_STUDENT_DATA_UPLOAD_GUIDE.md#method-2-direct-sql-upload)

---

### Method 3: Batch Import UI

**Best for**: Non-technical users, visual interface

1. Log in as admin
2. Go to Students → Batch Import
3. Upload CSV or Excel file
4. Review and confirm

📖 Guide: [REAL_STUDENT_DATA_UPLOAD_GUIDE.md](./REAL_STUDENT_DATA_UPLOAD_GUIDE.md#method-3-using-the-batch-import-ui)

---

## 🔧 Prerequisites Checklist

Before uploading, ensure you have:

- [ ] Supabase project created
- [ ] Database schema created (run `schema.sql`)
- [ ] Environment variables set in `.env.local`:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```
- [ ] Dependencies installed: `npm install`
- [ ] CSV file prepared with real student data

---

## 📋 CSV Format Reminder

Your CSV file should have these columns:

```csv
name,email,studentId,college,yearLevel,course,phone,password
```

**Required**: name, email, studentId, college, yearLevel, course  
**Optional**: phone, password

**Important Rules**:
- `studentId` must be **numbers only** (e.g., 2024001)
- `yearLevel` must be YEAR_1, YEAR_2, YEAR_3, or YEAR_4
- `email` must be unique
- `studentId` must be unique

---

## 🧪 Test First!

Before uploading all your data, **test with a small batch**:

1. Create a test CSV with 5 students
2. Run the test script: `node scripts/test-upload.js`
3. Upload test batch: `node scripts/upload-students.js test.csv`
4. Verify in Supabase dashboard
5. Once confirmed, upload full dataset

---

## 📊 What Happens During Upload

1. **Validation**: Checks all required fields
2. **Duplicate Check**: Skips existing emails/student IDs
3. **User Creation**: Creates account in `users` table
4. **Student Creation**: Creates record in `students` table
5. **Error Handling**: Reports failures, continues with next student
6. **Summary**: Shows success/failure counts

---

## 🔍 Verifying Upload Success

After upload, check:

1. **Supabase Dashboard**:
   - Go to Table Editor → `users`
   - Go to Table Editor → `students`
   - Verify counts match your CSV

2. **Application**:
   - Log in to the dashboard
   - Go to Students page
   - Check if students appear

3. **Test Login**:
   - Try logging in as a student
   - Use email and password from CSV

---

## 🆘 Common Issues & Solutions

### Issue: "Supabase credentials not found"
**Solution**: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

### Issue: "Email already exists"
**Solution**: Each email must be unique. Check for duplicates in your CSV.

### Issue: "Student ID already exists"  
**Solution**: Each student ID must be unique. Check for duplicates.

### Issue: "Invalid year level"
**Solution**: Use YEAR_1, YEAR_2, YEAR_3, or YEAR_4 (uppercase).

### Issue: Script runs slow
**Solution**: Normal behavior. Processes one student at a time for safety. For 100+ students, expect 2-5 minutes.

---

## 📚 Additional Resources

- [Quick Upload Guide](./QUICK_UPLOAD_GUIDE.md) - 5-minute quick start
- [Complete Upload Guide](./REAL_STUDENT_DATA_UPLOAD_GUIDE.md) - Detailed documentation
- [Batch Import Guide](./BATCH_IMPORT_GUIDE.md) - UI-based import
- [Scripts Documentation](./scripts/README.md) - All script details

---

## 💡 Pro Tips

1. **Start Small**: Test with 5-10 students first
2. **Clean Data**: Remove duplicates before upload
3. **Backup First**: Always backup before major changes
4. **Default Passwords**: Use a consistent default like `student2024`
5. **Re-runnable**: Script is safe to re-run - skips duplicates

---

## 🎯 Next Steps

1. ✅ Complete prerequisites checklist
2. ✅ Test connection with `test-upload.js`
3. ✅ Prepare your CSV file
4. ✅ Upload your real student data
5. ✅ Verify in Supabase dashboard
6. ✅ Test login as a student
7. ✅ Celebrate! 🎉

---

## 🔐 Security Reminders

- ✅ Never commit `.env.local` to Git
- ✅ Keep service role key secure
- ✅ Use strong default passwords
- ✅ Enable RLS policies in production
- ✅ Consider password reset flow

---

## ✨ You're All Set!

Everything is ready for you to upload your real student data. Follow the guides and you'll be up and running in minutes!

**Questions?** Check the troubleshooting sections in the guides.

**Happy uploading! 🚀**

