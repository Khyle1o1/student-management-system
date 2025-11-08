# Report Filtering Feature - College & Course Filters

## Overview

As an admin, you can now generate Event Summary and Fees Summary reports filtered by specific college or course. This allows you to create targeted reports for specific academic units.

## Features Implemented

### 1. Filter Dropdowns Added

Each quick report card now includes:
- **College Filter** - Dropdown to select a specific college
- **Course Filter** - Dropdown to select a specific course (dependent on college selection)
- **Clear Filters** button - Reset filters to show all data

### 2. Smart Course Selection

- Course dropdown is **disabled** until a college is selected
- When you select a college, the course dropdown **automatically populates** with courses from that college
- Changing the college **resets** the course selection

### 3. Dynamic Report Generation

Reports are generated with the selected filters:
- **No filters** = All data (University-wide)
- **College only** = Data for that college
- **College + Course** = Data for that specific course

## How to Use

### Generate Event Summary Report for a College

1. Navigate to **Dashboard → Reports → Overview**
2. Find the **Event Summary Report** card
3. Select a **college** from the dropdown (e.g., "College of Business")
4. Click **"Generate Report"**
5. PDF downloads with only events and attendance for that college

### Generate Event Summary Report for a Course

1. Navigate to **Dashboard → Reports → Overview**
2. Find the **Event Summary Report** card
3. Select a **college** from the dropdown
4. Select a **course** from the dropdown (e.g., "Bachelor of Science in Accountancy")
5. Click **"Generate Report"**
6. PDF downloads with only events and attendance for that course

### Generate University-Wide Report (All Data)

1. Navigate to **Dashboard → Reports → Overview**
2. Find any report card
3. Leave filters as **"All Colleges"** (default)
4. Click **"Generate Report"**
5. PDF downloads with all data

### Clear Filters

If you've selected filters and want to reset:
1. Click the **"Clear Filters"** button below the dropdowns
2. Both college and course selections reset to "All Colleges"

## Filter Options Available

### Colleges:
- College of Arts and Sciences
- College of Business
- College of Education
- College of Nursing
- College of Technologies
- College of Public Administration and Governance

### Courses (by College):

Each college has its own set of courses. For example:

**College of Business:**
- Bachelor of Science in Accountancy
- Bachelor of Science in Business Administration major in Financial Management
- Bachelor of Science in Hospitality Management

(See `src/lib/constants/academic-programs.ts` for complete list)

## Report Types That Support Filtering

### ✅ Event Summary Report
- Filters events by scope
- Shows only events for selected college/course
- Calculates attendance rates for filtered scope
- Updates overall statistics accordingly

### ✅ Fees Summary Report
- Filters fees by scope
- Shows only fees for selected college/course
- Calculates payment totals for filtered scope
- Updates revenue statistics accordingly

## Examples

### Example 1: Business College Report

**Scenario:** You want to see attendance for all College of Business events

**Steps:**
1. Select "College of Business" from college dropdown
2. Leave course as "All Courses"
3. Click "Generate Report"

**Result:** PDF shows:
- Only events scoped to College of Business or University-wide
- Attendance statistics for Business students
- Overall rate for Business college

### Example 2: Specific Course Report

**Scenario:** You want payment report for BSA students only

**Steps:**
1. Go to Fees Summary Report card
2. Select "College of Business"
3. Select "Bachelor of Science in Accountancy"
4. Click "Generate Report"

**Result:** PDF shows:
- Only fees applicable to BSA course
- Payment data for BSA students
- Total revenue from BSA students

### Example 3: All Data Report

**Scenario:** You want complete university report

**Steps:**
1. Leave all filters as "All Colleges"
2. Click "Generate Report"

**Result:** PDF shows:
- All events/fees across entire university
- Complete attendance/payment data
- University-wide statistics

## Technical Implementation

### Frontend (reports-management.tsx)

```typescript
// State management for filters
const [eventFilters, setEventFilters] = useState({
  college: "",
  course: ""
})

// Building query parameters
const params = new URLSearchParams()
if (eventFilters.college) params.append('college', eventFilters.college)
if (eventFilters.course) params.append('course', eventFilters.course)

// API call with filters
const url = `/api/reports/events-summary/pdf?${params.toString()}`
```

### Backend (API already supported filters)

The API endpoints already had filter support via query parameters:
- `/api/reports/events-summary/pdf?college=College+of+Business`
- `/api/reports/fees-summary/pdf?course=Bachelor+of+Science+in+Accountancy`

The filtering logic applies proper scope-based queries to fetch only relevant data.

## Benefits

### For Administrators
✅ **Targeted Reports** - Get specific data for your unit
✅ **Quick Analysis** - No need to manually filter in spreadsheets
✅ **Accurate Metrics** - Statistics calculated for specific scope
✅ **Time Saving** - Generate relevant reports instantly

### For College Organizers
✅ **Own Data** - Focus on your college's performance
✅ **Course Comparison** - Compare different courses easily
✅ **Better Decisions** - Data-driven insights for your unit

### For Course Coordinators
✅ **Course Focus** - See only your course's data
✅ **Student Tracking** - Monitor your students specifically
✅ **Relevant Metrics** - Rates and stats for your scope

## File Naming Convention

Generated PDFs include filter information in filename:

- **No filters:** `event-summary-report-2025-01-15.pdf`
- **College filter:** `event-summary-report-college-of-business-2025-01-15.pdf`
- **Course filter:** `event-summary-report-bachelor-of-science-in-accountancy-2025-01-15.pdf`

This makes it easy to identify which report is which when you have multiple downloads.

## UI/UX Features

### Smart Defaults
- Filters default to "All Colleges" (show everything)
- Course dropdown disabled until college selected
- Clear indication of what's filtered

### Visual Feedback
- Loading spinner during generation
- Disabled state for unavailable options
- Clear button appears only when filters are active

### Responsive Design
- Filters stack nicely in cards
- Works on mobile and desktop
- Dropdown menus scroll for long lists

## Troubleshooting

### Issue: Course dropdown is disabled
**Solution:** Select a college first - courses are specific to each college

### Issue: Report shows no data
**Solution:** 
- Check if events/fees exist for that college/course
- Try removing course filter (keep only college)
- Try "All Colleges" to see if any data exists

### Issue: Wrong data in report
**Solution:**
- Verify the college/course selection before generating
- Check event/fee scope settings in the system
- Events/fees must be properly scoped to appear in filtered reports

## Testing

### Test Case 1: College Filter
1. Select "College of Education"
2. Generate Event Summary Report
3. **Expected:** Only Education events shown

### Test Case 2: Course Filter
1. Select "College of Business"
2. Select "Bachelor of Science in Accountancy"
3. Generate Fees Summary Report
4. **Expected:** Only BSA fees and payments shown

### Test Case 3: Clear Filters
1. Set filters to any value
2. Click "Clear Filters"
3. **Expected:** Dropdowns reset to "All Colleges"

### Test Case 4: Dynamic Courses
1. Select "College of Nursing"
2. Check course dropdown
3. **Expected:** Only "Bachelor of Science in Nursing" appears

## Related Files

- `src/components/dashboard/reports-management.tsx` - Main component with filters
- `src/lib/constants/academic-programs.ts` - College and course definitions
- `src/app/api/reports/events-summary/pdf/route.ts` - Event report API
- `src/app/api/reports/fees-summary/pdf/route.ts` - Fees report API

## Future Enhancements

Potential improvements:
- [ ] Date range filters
- [ ] Year level filters
- [ ] Multiple college selection
- [ ] Save filter presets
- [ ] Export to Excel with filters
- [ ] Schedule filtered reports

## Conclusion

The report filtering feature gives administrators powerful control over report generation. You can now quickly create targeted reports for specific colleges or courses, making data analysis more efficient and relevant to your needs.

