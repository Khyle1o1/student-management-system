# 📊 Reports - Role-Based Access Control (RBAC) Guide

## Overview
The Event Summary and Fees Summary reports now implement comprehensive role-based access control based on user assignments. Users will only see data relevant to their role and assigned college/course.

---

## 🔐 Access Control Rules

### 1. **ADMIN (System Administrator)**
**Full Access - No Restrictions**

- ✅ Can view ALL events and fees from:
  - UNIVERSITY_WIDE scope
  - ALL colleges (COLLEGE_WIDE)
  - ALL courses (COURSE_SPECIFIC)
- ✅ Can apply any filters (college, course, date range, semester)
- ✅ Reports include complete system-wide data

**Example:**
- Admin generates Event Summary Report → Shows all 50 events across all colleges
- Admin generates Fees Summary Report → Shows all fees from all colleges and courses

---

### 2. **COLLEGE_ORG (College Organization)**
**College-Specific Access**

- ✅ Can view events/fees from:
  - UNIVERSITY_WIDE scope (affects everyone)
  - Their **assigned college** only (COLLEGE_WIDE)
- ❌ Cannot view:
  - Other colleges' specific events/fees
  - Course-specific events/fees (unless they match their college)

**Example:**
- User: College of Engineering Organization
- Assigned College: "College of Engineering"

**Event Summary Report will show:**
- ✅ University-wide events (e.g., University Day)
- ✅ College of Engineering events (e.g., Engineering Week)
- ❌ College of Science events
- ❌ Course-specific events (e.g., BSCS Orientation)

**Fees Summary Report will show:**
- ✅ University-wide fees (e.g., ID Fee)
- ✅ College of Engineering fees (e.g., Engineering Lab Fee)
- ❌ Other colleges' fees

---

### 3. **COURSE_ORG (Course Organization)**
**Course-Specific Access**

- ✅ Can view events/fees from:
  - UNIVERSITY_WIDE scope
  - Their **assigned college** (COLLEGE_WIDE)
  - Their **assigned course** (COURSE_SPECIFIC)
- ❌ Cannot view:
  - Other colleges' events/fees
  - Other courses' events/fees

**Example:**
- User: BSCS Organization
- Assigned College: "College of Engineering"
- Assigned Course: "BSCS"

**Event Summary Report will show:**
- ✅ University-wide events
- ✅ College of Engineering events
- ✅ BSCS-specific events (e.g., BSCS Field Trip)
- ❌ BSIT events (different course)
- ❌ Other colleges' events

**Fees Summary Report will show:**
- ✅ University-wide fees
- ✅ College of Engineering fees
- ✅ BSCS-specific fees
- ❌ Fees for other courses

---

## 📋 How It Works

### Data Filtering Logic

#### For Events:
```
ADMIN:
  → Shows ALL events (no filtering)

COLLEGE_ORG:
  → Shows: UNIVERSITY_WIDE OR (COLLEGE_WIDE AND college = user's assigned college)

COURSE_ORG:
  → Shows: UNIVERSITY_WIDE OR 
           (COLLEGE_WIDE AND college = user's assigned college) OR
           (COURSE_SPECIFIC AND course = user's assigned course)
```

#### For Fees:
```
ADMIN:
  → Shows ALL fees (no filtering)

COLLEGE_ORG:
  → Shows: UNIVERSITY_WIDE OR (COLLEGE_WIDE AND college = user's assigned college)

COURSE_ORG:
  → Shows: UNIVERSITY_WIDE OR 
           (COLLEGE_WIDE AND college = user's assigned college) OR
           (COURSE_SPECIFIC AND course = user's assigned course)
```

---

## 🎯 Student Count Calculation

Reports automatically calculate student counts based on the scope:

### For UNIVERSITY_WIDE Events/Fees:
- Counts ALL active students in the system

### For COLLEGE_WIDE Events/Fees:
- Counts only students from the specified college

### For COURSE_SPECIFIC Events/Fees:
- Counts only students from the specified course

**Note:** Only non-archived students are included in calculations.

---

## 💡 Practical Examples

### Example 1: Engineering College Report

**User:** College of Engineering Organization
**Role:** COLLEGE_ORG
**Assigned College:** "College of Engineering"

**Generates Event Summary Report:**

| Event Name | Scope | Visible? |
|-----------|-------|----------|
| University Day | UNIVERSITY_WIDE | ✅ Yes |
| Engineering Week | COLLEGE_WIDE (Engineering) | ✅ Yes |
| Science Fair | COLLEGE_WIDE (Science) | ❌ No |
| BSCS Seminar | COURSE_SPECIFIC (BSCS) | ❌ No |

**Result:** Report shows 2 events with attendance data

---

### Example 2: BSCS Course Report

**User:** BSCS Organization
**Role:** COURSE_ORG
**Assigned College:** "College of Engineering"
**Assigned Course:** "BSCS"

**Generates Fees Summary Report:**

| Fee Name | Scope | Visible? |
|---------|-------|----------|
| ID Fee | UNIVERSITY_WIDE | ✅ Yes |
| Engineering Lab Fee | COLLEGE_WIDE (Engineering) | ✅ Yes |
| BSCS Project Fee | COURSE_SPECIFIC (BSCS) | ✅ Yes |
| BSIT Lab Fee | COURSE_SPECIFIC (BSIT) | ❌ No |

**Result:** Report shows 3 fees with payment data

---

### Example 3: Admin Report

**User:** System Administrator
**Role:** ADMIN

**Generates Event Summary Report:**

| Event Name | Scope | Visible? |
|-----------|-------|----------|
| ALL Events | ALL Scopes | ✅ Yes |

**Result:** Report shows complete system data (e.g., 50 events total)

---

## 🔒 Security Features

### 1. **Automatic Filtering**
- Reports automatically filter based on user's session data
- No manual selection needed
- Users cannot bypass their access restrictions

### 2. **Session-Based Authentication**
- Uses NextAuth session to verify user identity
- Checks `assigned_college` and `assigned_course` from session
- Enforces role-based permissions at API level

### 3. **Database-Level Filtering**
- Filtering happens at database query level
- Prevents unauthorized data from being fetched
- Efficient and secure

### 4. **Fallback Behavior**
- If no college/course assigned: Shows only UNIVERSITY_WIDE data
- If authentication fails: Returns 401 Unauthorized
- If role not permitted: Returns 403 Forbidden

---

## 📊 Report Accuracy

### Data Integrity
- **Student Counts:** Based on active (non-archived) students only
- **Attendance Rates:** Calculated from actual attendance records
- **Payment Data:** Only counts PAID status payments
- **Real-Time:** Reports reflect current database state

### Scope Matching
- Event/Fee scope must match student eligibility
- Students counted based on their college/course
- Accurate representation of relevant population

---

## 🚀 User Experience

### For College Organizations:
1. Login with COLLEGE_ORG account
2. Navigate to Reports → Quick Reports
3. Click "Generate Report"
4. **PDF automatically includes only your college's data**
5. No need to select filters (though you can refine further)

### For Course Organizations:
1. Login with COURSE_ORG account
2. Navigate to Reports
3. Generate Event or Fees Summary
4. **PDF includes university-wide + your college + your course data**
5. Accurate course-level statistics

### For Administrators:
1. Login with ADMIN account
2. Full access to all reports
3. Can apply filters to focus on specific colleges/courses
4. Complete system overview

---

## 🔧 Technical Implementation

### API Endpoints Updated:
- ✅ `/api/reports/events-summary`
- ✅ `/api/reports/events-summary/pdf`
- ✅ `/api/reports/fees-summary`
- ✅ `/api/reports/fees-summary/pdf`

### Session Properties Used:
```typescript
session.user.role                // ADMIN | COLLEGE_ORG | COURSE_ORG
session.user.assigned_college    // College assignment
session.user.assigned_course     // Course assignment
```

### Database Tables:
- `events` - Filtered by scope_type, scope_college, scope_course
- `fee_structures` - Filtered by scope_type, scope_college, scope_course
- `students` - Filtered by college, course, archived status
- `attendance` - Related to filtered events
- `payments` - Related to filtered fees

---

## ✅ Testing Scenarios

### Test Case 1: College Organization Access
1. Create/login as COLLEGE_ORG user for "College of Engineering"
2. Generate Event Summary Report
3. Verify report only shows:
   - University-wide events
   - College of Engineering events
4. Verify it doesn't show other colleges' events

### Test Case 2: Course Organization Access
1. Create/login as COURSE_ORG user for "BSCS"
2. Generate Fees Summary Report
3. Verify report shows:
   - University-wide fees
   - College of Engineering fees (parent college)
   - BSCS-specific fees
4. Verify it doesn't show BSIT or other course fees

### Test Case 3: Admin Full Access
1. Login as ADMIN
2. Generate both reports
3. Verify reports show complete data from all scopes

### Test Case 4: No Assignment Edge Case
1. Login as COLLEGE_ORG without assigned_college
2. Generate report
3. Verify only UNIVERSITY_WIDE data is shown

---

## 📚 Related Documentation

- `REPORTS_IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `REPORTS_USER_GUIDE.md` - User-friendly usage guide
- `USER_MANAGEMENT_MODULE.md` - User roles and permissions

---

## 🎉 Summary

✅ **ADMIN**: Full system access - all events, all fees, all colleges, all courses

✅ **COLLEGE_ORG**: College-level access - university-wide + their college only

✅ **COURSE_ORG**: Course-level access - university-wide + their college + their course

✅ **Automatic**: No manual configuration needed - based on user assignments

✅ **Secure**: Database-level filtering - cannot be bypassed

✅ **Accurate**: Proper student counts and statistics per scope

---

**Made with ❤️ by Khyle Amacna of AOG Tech**

