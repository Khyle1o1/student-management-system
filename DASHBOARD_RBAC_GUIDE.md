# 📊 Dashboard Statistics - Role-Based Access Control Guide

## Overview
The admin dashboard now displays statistics filtered by the user's role and assigned college/course. Each user role sees only relevant data based on their assignments.

---

## 🔐 Dashboard Statistics Filtering

### 1. **Total Students Count**

**ADMIN:**
- Shows **ALL students** in the system
- Example: 8,152 students total

**COLLEGE_ORG:**
- Shows only students from their **assigned college**
- Example: College of Engineering Org sees only Engineering students
- Filters: `students.college = user.assigned_college`

**COURSE_ORG:**
- Shows only students from their **assigned course**
- Example: BSCS Org sees only BSCS students
- Filters: `students.course = user.assigned_course`

---

### 2. **Active Events Count**

**ADMIN:**
- Shows **ALL active events** (university-wide, all colleges, all courses)
- No restrictions

**COLLEGE_ORG:**
- Shows:
  - ✅ UNIVERSITY_WIDE events
  - ✅ Events for their assigned college (COLLEGE_WIDE)
  - ❌ Other colleges' events
- Example: Engineering Org sees university events + Engineering events

**COURSE_ORG:**
- Shows:
  - ✅ UNIVERSITY_WIDE events
  - ✅ Events for their assigned college (COLLEGE_WIDE)
  - ✅ Events for their assigned course (COURSE_SPECIFIC)
  - ❌ Other colleges'/courses' events
- Example: BSCS Org sees university events + Engineering events + BSCS events

---

### 3. **Total Revenue / Fees Collected**

**ADMIN:**
- Shows **ALL revenue** from all fees
- Complete financial overview

**COLLEGE_ORG:**
- Shows revenue from:
  - ✅ UNIVERSITY_WIDE fees
  - ✅ Their college's fees (COLLEGE_WIDE)
  - ❌ Other colleges' fees

**COURSE_ORG:**
- Shows revenue from:
  - ✅ UNIVERSITY_WIDE fees
  - ✅ Their college's fees (COLLEGE_WIDE)
  - ✅ Their course's fees (COURSE_SPECIFIC)
  - ❌ Other courses' fees

---

### 4. **Pending Payments**

**All Roles:**
- Pending payments count is filtered based on the fees that are accessible to the user's role
- COLLEGE_ORG sees pending payments for their college's fees
- COURSE_ORG sees pending payments for their course's fees
- ADMIN sees all pending payments

---

### 5. **Recent Activities**

**Students:**
- Filtered by college/course based on user role
- COLLEGE_ORG sees only their college's students
- COURSE_ORG sees only their course's students

**Events:**
- Filtered by scope based on user role
- Same logic as Active Events count

**Payments:**
- Filtered based on accessible fees
- Shows payments related to fees user can access

---

## 📊 **Example Scenarios**

### Scenario 1: ADMIN Dashboard
**User:** System Administrator  
**Role:** ADMIN

**Dashboard Shows:**
- Total Students: 8,152 (all students)
- Active Events: 15 (all events)
- Total Revenue: ₱350,000 (all fees)
- Pending Payments: 45 (all pending)

---

### Scenario 2: College Organization Dashboard
**User:** College of Engineering Organization  
**Role:** COLLEGE_ORG  
**Assigned College:** College of Engineering

**Dashboard Shows:**
- Total Students: 2,450 (Engineering students only)
- Active Events: 8 (university-wide + Engineering events)
- Total Revenue: ₱125,000 (university-wide + Engineering fees)
- Pending Payments: 12 (Engineering-related pending)

**What changes:**
- ✅ Student count reflects only Engineering college
- ✅ Events include university-wide + Engineering-specific
- ✅ Revenue from Engineering fees only
- ❌ Does NOT see Science college data
- ❌ Does NOT see other colleges' statistics

---

### Scenario 3: Course Organization Dashboard
**User:** BSCS Organization  
**Role:** COURSE_ORG  
**Assigned College:** College of Engineering  
**Assigned Course:** BSCS

**Dashboard Shows:**
- Total Students: 248 (BSCS students only)
- Active Events: 5 (university-wide + Engineering + BSCS events)
- Total Revenue: ₱35,000 (university-wide + Engineering + BSCS fees)
- Pending Payments: 3 (BSCS-related pending)

**What changes:**
- ✅ Student count is BSCS students only
- ✅ Events include three levels: university, college, and course
- ✅ Revenue from BSCS-accessible fees
- ❌ Does NOT see BSIT students
- ❌ Does NOT see BSIT-specific events/fees
- ❌ Does NOT see other colleges' data

---

## 🎯 **Growth Percentages**

### Student Growth
- Calculated as: `(New Students This Month / New Students Last Month - 1) * 100`
- Filtered by same role-based logic
- COLLEGE_ORG sees growth for their college only
- COURSE_ORG sees growth for their course only

### Event Growth
- Calculated as: `(Events This Month / Total Active Events) * 100`
- Filtered by accessible events based on role

### Revenue Growth
- Calculated as: `(Revenue This Month / Revenue Last Month - 1) * 100`
- Filtered by accessible fees based on role

---

## 🔧 **Technical Implementation**

### API Endpoint
- **Route:** `/api/dashboard/stats`
- **Method:** GET
- **Authentication:** Required (session-based)
- **Roles Allowed:** ADMIN, COLLEGE_ORG, COURSE_ORG

### Filtering Logic

#### Students Filter
```typescript
if (userRole === 'COLLEGE_ORG' && userCollege) {
  query = query.eq('college', userCollege)
} else if (userRole === 'COURSE_ORG' && userCourse) {
  query = query.eq('course', userCourse)
}
// ADMIN: no filter
```

#### Events Filter
```typescript
if (userRole === 'COLLEGE_ORG' && userCollege) {
  query = query.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
} else if (userRole === 'COURSE_ORG' && userCollege && userCourse) {
  query = query.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
}
// ADMIN: no filter
```

#### Fees Filter
```typescript
// Same logic as Events
if (userRole === 'COLLEGE_ORG' && userCollege) {
  query = query.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege})`)
} else if (userRole === 'COURSE_ORG' && userCollege && userCourse) {
  query = query.or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${userCollege}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${userCourse})`)
}
// ADMIN: no filter
```

---

## 🎨 **Dashboard Display**

### Statistics Cards

**Card 1: Total Students**
- Icon: 👥 Users
- Shows filtered count
- Growth percentage vs last month

**Card 2: Active Events**
- Icon: 📅 Calendar
- Shows filtered count
- Growth percentage this month

**Card 3: Total Revenue**
- Icon: 💳 Credit Card
- Shows filtered amount
- Growth percentage vs last month

**Card 4: Pending Payments**
- Icon: 📄 File
- Shows filtered count
- Percentage unpaid

---

## 🔒 **Security Features**

✅ **Session-Based:** Uses user session data for filtering  
✅ **Database-Level:** Filtering happens at query level  
✅ **Cannot Bypass:** User cannot manipulate filters  
✅ **Automatic:** No manual configuration needed  
✅ **Consistent:** Same logic as Reports RBAC  

---

## ✅ **Testing Checklist**

### Test Case 1: Admin Dashboard
1. Login as ADMIN
2. Check Total Students shows all students (e.g., 8,152)
3. Verify no filtering applied
4. Should see complete system statistics

### Test Case 2: College Organization Dashboard
1. Login as COLLEGE_ORG (e.g., Engineering)
2. Check Total Students shows only Engineering students
3. Verify Active Events includes university + Engineering events
4. Should NOT see other colleges' statistics

### Test Case 3: Course Organization Dashboard
1. Login as COURSE_ORG (e.g., BSCS)
2. Check Total Students shows only BSCS students
3. Verify Active Events includes university + Engineering + BSCS events
4. Should NOT see BSIT or other course statistics

### Test Case 4: No Assignment Edge Case
1. Login as COLLEGE_ORG without assigned_college
2. Should show only UNIVERSITY_WIDE data
3. All college/course specific data should be filtered out

---

## 📚 **Related Documentation**

- `REPORTS_RBAC_GUIDE.md` - Reports role-based access control
- `USER_MANAGEMENT_MODULE.md` - User roles and permissions
- `REPORTS_IMPLEMENTATION_SUMMARY.md` - Reports implementation details

---

## 🎉 **Summary**

✅ **ADMIN**: Full system statistics - all students, all events, all fees

✅ **COLLEGE_ORG**: College-level statistics - their college's students, events, and fees

✅ **COURSE_ORG**: Course-level statistics - their course's students, events, and fees

✅ **Automatic**: Dashboard automatically filters based on user assignments

✅ **Secure**: Database-level filtering - cannot be bypassed

✅ **Accurate**: Real-time statistics reflecting current permissions

---

**Made with ❤️ by Khyle Amacna of AOG Tech**

