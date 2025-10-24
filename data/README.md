# Data Directory

This directory contains CSV templates for uploading student data.

## 📁 Files

### `students-template.csv`
**Purpose**: Basic template with 4 sample students

**Use this for**:
- Understanding the required format
- Small datasets
- Testing the upload process

**Columns**:
```csv
name,email,studentId,college,yearLevel,course,phone,password
```

---

### `students-template-extended.csv`
**Purpose**: Extended template with 10 sample students

**Use this for**:
- More comprehensive examples
- Understanding diverse data scenarios
- Larger test datasets

**Columns**: Same as basic template

---

## 🚀 How to Use

### Step 1: Copy a Template
```bash
# Copy the template you want to use
cp data/students-template.csv data/my-students.csv
```

### Step 2: Edit with Your Data

Open `data/my-students.csv` and replace the sample data with your real student data.

**Required Fields**:
- `name` - Full name of student
- `email` - Must be unique
- `studentId` - Numbers only, must be unique
- `college` - College name
- `yearLevel` - YEAR_1, YEAR_2, YEAR_3, or YEAR_4
- `course` - Course/program name

**Optional Fields**:
- `phone` - Phone number
- `password` - Default password (if blank, uses `student{studentId}`)

### Step 3: Upload

```bash
node scripts/upload-students.js data/my-students.csv
```

---

## ✅ Data Validation Rules

### Student ID
- ✓ Numbers only (e.g., 2024001)
- ✓ Must be unique
- ✗ No letters or special characters

### Email
- ✓ Valid email format
- ✓ Must be unique
- ✓ Should match your institution's domain

### Year Level
- ✓ Use: YEAR_1, YEAR_2, YEAR_3, YEAR_4
- ✓ Or: 1, 2, 3, 4
- ✗ Don't use: Year 1, First Year, 1st, etc.

---

## 📝 Example Data

### Good Data ✅
```csv
name,email,studentId,college,yearLevel,course,phone,password
Juan Cruz,juan@student.edu,2024001,Technology,YEAR_1,Computer Science,09171234567,student2024
Maria Santos,maria@student.edu,2024002,Engineering,2,Civil Engineering,09181234567,student2024
```

### Bad Data ❌
```csv
name,email,studentId,college,yearLevel,course,phone,password
Juan Cruz,invalid-email,STU2024001,Technology,Year 1,Computer Science,09171234567,student2024
```

**Problems**:
- Email is not valid format
- Student ID contains letters (STU)
- Year level should be YEAR_1 not "Year 1"

---

## 💡 Tips

1. **Clean your data first**
   - Remove duplicates
   - Ensure consistent formatting
   - Validate emails

2. **Test with small batch**
   - Create a test file with 5 students
   - Upload and verify
   - Then upload full dataset

3. **Backup source data**
   - Keep original spreadsheet
   - Don't delete CSV after upload
   - Keep for reference

4. **Use consistent naming**
   - College names should match exactly
   - Course names should be consistent
   - Avoid typos

---

## 🆘 Need Help?

- [Quick Upload Guide](../QUICK_UPLOAD_GUIDE.md)
- [Complete Upload Guide](../REAL_STUDENT_DATA_UPLOAD_GUIDE.md)
- [Upload Flowchart](../UPLOAD_FLOWCHART.md)

---

**Happy uploading! 📊**

