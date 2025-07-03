# Batch Student Import Feature

## Overview
The batch student import feature allows administrators to upload multiple student records at once using CSV or Excel files. This reduces manual data entry and ensures consistent data formatting.

## Features

### ✅ Supported File Formats
- **CSV** (.csv) - Comma-separated values
- **Excel** (.xlsx, .xls) - Microsoft Excel formats

### ✅ Validation & Error Handling
- **Field Validation**: Ensures all required fields are present and properly formatted
- **Email Validation**: Checks for valid email format
- **Duplicate Detection**: Prevents duplicate student IDs and emails
- **Real-time Feedback**: Shows detailed error messages for invalid rows

### ✅ Data Requirements

#### Required Fields:
- `name` - Full name of the student
- `studentId` - Unique student identifier (numbers only)
- `email` - Valid email address
- `yearLevel` - Must be one of: YEAR_1, YEAR_2, YEAR_3, YEAR_4
- `course` - Course/program name
- `college` - College name (e.g., College of Technology, College of Engineering)

#### Optional Fields:
- `password` - Account password (defaults to 'student123' if not provided)

### ✅ Sample Data Format

```csv
name,studentId,email,yearLevel,course,college,password
John Doe,2024001,john.doe@student.edu,YEAR_1,Computer Science,College of Technology,student123
Jane Smith,2024002,jane.smith@student.edu,YEAR_2,Information Technology,College of Engineering,student123
```

## How to Use

### Step 1: Access Settings
1. Login as an administrator
2. Navigate to **Dashboard > Settings**
3. Find the "Batch Student Import" section

### Step 2: Download Template
1. Click "Download CSV Template" or "Download Excel Template"
2. Open the downloaded file
3. Use it as a reference for formatting your data

### Step 3: Prepare Your Data
1. Create your student data file using the same column structure as the template
2. Ensure all required fields are filled
3. Use the exact year level values: YEAR_1, YEAR_2, YEAR_3, YEAR_4

### Step 4: Upload and Preview
1. Click "Choose File" and select your CSV or Excel file
2. Review the preview showing the first 10 records
3. Check for any obvious formatting issues

### Step 5: Import
1. Click "Import Records" to start the process
2. Wait for the upload to complete
3. Review the import results

### Step 6: Review Results
The system will show:
- **Total Records**: Number of rows processed
- **Successful**: Records successfully imported
- **Errors**: Validation failures with details
- **Duplicates**: Records skipped due to existing data

## Error Types & Solutions

### Common Validation Errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "name is required" | Empty name field | Ensure all students have names |
| "Invalid email format" | Malformed email | Use valid email format (user@domain.com) |
| "Student ID already exists" | Duplicate student ID | Use unique student IDs |
| "Year level must be one of..." | Invalid year level | Use exact values: YEAR_1, YEAR_2, etc. |

### Data Formatting Tips:
- Remove any extra spaces before/after values
- Use consistent capitalization for year levels
- Ensure student IDs contain only letters and numbers
- Test with a small file first (2-3 records)

## Security Features

### ✅ Access Control
- Only administrators can access the batch import feature
- Session validation for all operations

### ✅ Data Validation
- Server-side validation for all fields
- SQL injection prevention
- Password hashing for security

### ✅ Duplicate Prevention
- Checks existing student IDs and emails
- Prevents duplicate entries within the same batch
- Maintains data integrity

## Technical Details

### API Endpoint
- **URL**: `/api/students/batch-import`
- **Method**: POST
- **Authentication**: Admin role required
- **Content-Type**: application/json

### Response Format
```json
{
  "successCount": 15,
  "errorCount": 2,
  "duplicateCount": 1,
  "duplicates": ["STU2024001"],
  "errors": [
    {
      "row": 3,
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

### File Size Limits
- Maximum file size: 10MB
- Recommended batch size: 100-500 records
- Large files are processed efficiently with progress feedback

## Troubleshooting

### Import Failed
1. Check file format (CSV or Excel)
2. Verify all required columns are present
3. Ensure no special characters in student IDs
4. Try with a smaller sample first

### Slow Processing
1. Check file size (smaller batches process faster)
2. Verify internet connection
3. Wait for completion (don't refresh the page)

### Partial Success
1. Review error details for failed records
2. Fix data issues in the original file
3. Re-import only the failed records

## Best Practices

### 🎯 Data Preparation
- Always download and review the template first
- Test with a small subset before importing large batches
- Keep a backup of your original data file
- Use consistent formatting throughout

### 🎯 Quality Control
- Review the preview before importing
- Check for duplicate student IDs in your file
- Validate email addresses before upload
- Ensure year levels match exactly

### 🎯 Import Strategy
- Start with smaller batches (50-100 records)
- Import during low-usage periods
- Keep administrators informed of large imports
- Document any data transformations made

## Support

If you encounter issues:
1. Check this guide for common solutions
2. Review error messages carefully
3. Test with the provided template
4. Contact your system administrator

## Version History

- **v1.0** - Initial release with CSV/Excel support, validation, and duplicate detection
- **Features**: Template download, preview, progress tracking, error reporting 