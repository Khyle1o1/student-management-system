# 📋 Evaluation Forms System - Google Forms Clone

A comprehensive, full-featured evaluation form system that mimics Google Forms functionality with advanced statistics and analytics.

## 🎯 Overview

This system provides a complete Google Forms-like experience with:
- **Form Builder**: Intuitive drag-and-drop interface for creating forms
- **Response Collection**: User-friendly interface for filling out forms
- **Advanced Analytics**: Real-time statistics with charts and graphs
- **Data Export**: Export responses as CSV or JSON
- **Role-Based Access**: Admin-only form creation, public form access

---

## 📁 File Structure

```
├── Database Migration
│   └── evaluation_forms_system_migration.sql    # Database schema
│
├── API Routes
│   ├── /api/forms
│   │   ├── route.ts                             # GET (list), POST (create)
│   │   └── [id]/
│   │       ├── route.ts                         # GET, PUT, DELETE form
│   │       ├── responses/route.ts               # GET, POST responses
│   │       ├── statistics/route.ts              # GET analytics
│   │       └── export/route.ts                  # GET export data
│
├── Components
│   ├── forms/
│   │   ├── FormBuilder.tsx                      # Form creation/editing
│   │   ├── FormsTable.tsx                       # Forms list
│   │   ├── FormResponse.tsx                     # User response interface
│   │   └── FormStatistics.tsx                   # Analytics dashboard
│
├── Pages
│   ├── /dashboard/forms                         # Admin forms list
│   ├── /dashboard/forms/new                     # Create new form
│   ├── /dashboard/forms/[id]/edit               # Edit form
│   ├── /dashboard/forms/[id]/statistics         # View statistics
│   └── /forms/[id]                              # Public form (user fills)
│
└── UI Components (New)
    ├── radio-group.tsx                          # Radio button group
    └── checkbox.tsx                             # Checkbox component
```

---

## 🗄️ Database Schema

### Tables Created

#### 1. `evaluation_forms`
Main table for storing forms.

```sql
- id: UUID (primary key)
- title: VARCHAR(255) - Form title
- description: TEXT - Form description
- questions: JSONB - Array of question objects
- settings: JSONB - Form configuration
- status: VARCHAR(50) - DRAFT, PUBLISHED, CLOSED
- created_by: UUID - Creator user ID
- published_at: TIMESTAMP
- closes_at: TIMESTAMP - Optional deadline
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. `form_responses`
Stores user submissions.

```sql
- id: UUID (primary key)
- form_id: UUID - Links to evaluation_forms
- respondent_id: UUID - User ID (NULL for anonymous)
- respondent_email: VARCHAR(255)
- respondent_name: VARCHAR(255)
- answers: JSONB - Response data
- submitted_at: TIMESTAMP
- ip_address: INET
- user_agent: TEXT
```

#### 3. `form_analytics`
Caches statistics for performance.

```sql
- id: UUID (primary key)
- form_id: UUID - Links to evaluation_forms
- total_responses: INTEGER
- completion_rate: DECIMAL(5,2)
- question_statistics: JSONB - Pre-calculated stats
- last_updated: TIMESTAMP
```

---

## 📝 Question Types Supported

### 1. **Short Answer**
- Single-line text input
- Use case: Name, email, short responses

### 2. **Paragraph**
- Multi-line text area
- Use case: Long-form feedback, comments

### 3. **Multiple Choice**
- Single selection from options
- Use case: Rating, preference selection

### 4. **Checkboxes**
- Multiple selections allowed
- Use case: "Select all that apply" questions

### 5. **Linear Scale**
- Numeric rating scale (e.g., 1-5)
- Customizable min/max values and labels
- Use case: Satisfaction ratings, agreement scales

### 6. **Dropdown**
- Single selection from dropdown menu
- Use case: Large option lists, categories

### 7. **Date**
- Date picker input
- Use case: Birth dates, event dates

### 8. **Time**
- Time picker input
- Use case: Preferred times, schedules

### 9. **Email**
- Email validation
- Use case: Contact information

---

## 🎨 Features

### Admin Features (Form Creator)

#### 1. Form Builder
- **Add Questions**: Click "Add Question" to insert new questions
- **Question Types**: Select from 9 different types
- **Reorder Questions**: Use drag handle or up/down arrows
- **Duplicate Questions**: Quick copy with one click
- **Required Fields**: Toggle to make questions mandatory
- **Question Description**: Add helper text below questions
- **Options Management**: Add/remove/edit options for choice questions
- **Linear Scale Config**: Set min/max values and labels

#### 2. Form Settings
- **Multiple Submissions**: Allow users to submit multiple times
- **Progress Bar**: Show completion progress
- **Shuffle Questions**: Randomize question order
- **Collect Email**: Require/request email addresses
- **Require Login**: Force authentication before submission
- **Confirmation Message**: Custom thank-you message

#### 3. Form Management
- **Draft Mode**: Save forms without publishing
- **Publish Forms**: Make forms available for responses
- **Close Forms**: Stop accepting responses
- **Set Deadline**: Automatically close at specific date/time
- **Copy Link**: Share form URL
- **Duplicate Form**: Create copy of existing form
- **Delete Form**: Remove form and all responses

#### 4. Advanced Statistics Dashboard

##### Summary Cards
- Total Responses
- Completion Rate
- Latest Response Date/Time
- Average Daily Responses

##### Question-by-Question Analytics

**For Multiple Choice / Dropdown:**
- Pie chart showing distribution
- Bar chart with counts
- Summary table with percentages
- Mode (most common answer)

**For Checkboxes:**
- Horizontal bar chart showing selection frequency
- Percentage of respondents who selected each option
- Table view with counts

**For Linear Scale:**
- Average, Median, Mode calculations
- Distribution bar chart
- Min/Max values
- Response count per value

**For Text Responses:**
- Scrollable list of all responses
- Response count
- Average word count
- Individual response cards

#### 5. Data Export
- **CSV Export**: Spreadsheet-compatible format
- **JSON Export**: Structured data with metadata
- Includes:
  - Response ID
  - Respondent information
  - All answers
  - Submission timestamps

### User Features (Form Respondent)

#### 1. Form Filling Interface
- Clean, modern UI with gradient header
- Progress bar (if enabled)
- Question numbering
- Required field indicators (red asterisk)
- Field validation
- Error messages for incomplete required fields
- Responsive design (mobile-friendly)

#### 2. Question Interactions
- **Short Answer**: Text input with placeholder
- **Paragraph**: Multi-line textarea
- **Multiple Choice**: Radio buttons
- **Checkboxes**: Multiple selection checkboxes
- **Dropdown**: Select menu
- **Linear Scale**: Interactive button scale with labels
- **Date/Time**: Native date/time pickers
- **Email**: Email validation

#### 3. Submission
- Validate all required fields
- Scroll to first error if validation fails
- Success message after submission
- Custom confirmation message (if set)
- Prevention of duplicate submissions (if configured)

---

## 🚀 Usage Guide

### For Administrators

#### Creating a Form

1. Navigate to **Dashboard → Forms**
2. Click **"New Form"** button
3. Enter form title and description
4. Click **"Add Question"** to add questions
5. For each question:
   - Enter question text
   - Select question type
   - Add options (if applicable)
   - Configure settings (required, description, etc.)
6. Click **"Settings"** to configure form settings
7. Click **"Preview"** to see how form will look
8. Click **"Save Draft"** or **"Publish"** when ready

#### Editing a Form

1. Go to **Dashboard → Forms**
2. Click **⋮** (more options) on the form
3. Select **"Edit"**
4. Make changes
5. Click **"Save Draft"** or **"Publish"**

#### Viewing Statistics

1. Go to **Dashboard → Forms**
2. Click **⋮** (more options) on the form
3. Select **"Statistics"**
4. View:
   - Summary cards at top
   - Question-by-question analysis
   - Charts and graphs
5. Click **"Export CSV"** or **"Export JSON"** to download data

#### Sharing a Form

1. Go to **Dashboard → Forms**
2. Ensure form status is **"Published"**
3. Click **⋮** (more options)
4. Select **"Copy Link"**
5. Share the link with users
   - Format: `https://your-domain.com/forms/{form-id}`

#### Closing a Form

**Method 1: Manual Close**
1. Edit the form
2. Change status to "CLOSED"
3. Save

**Method 2: Set Deadline**
1. Edit the form
2. Set `closes_at` date/time
3. Form automatically closes at that time

### For Users (Respondents)

#### Filling Out a Form

1. Open the form link shared by admin
2. Read form title and description
3. Answer all questions (required ones marked with *)
4. Review your answers
5. Click **"Submit"** button
6. See confirmation message

---

## 🔧 API Reference

### Forms API

#### List Forms
```http
GET /api/forms?page=1&limit=10&search=&status=
```

**Response:**
```json
{
  "forms": [
    {
      "id": "uuid",
      "title": "Form Title",
      "description": "Form description",
      "status": "PUBLISHED",
      "response_count": 42,
      "created_at": "2025-01-01T00:00:00Z",
      "published_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### Get Form
```http
GET /api/forms/{id}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Form Title",
  "description": "Form description",
  "questions": [...],
  "settings": {...},
  "status": "PUBLISHED",
  "response_count": 42
}
```

#### Create Form
```http
POST /api/forms
Content-Type: application/json

{
  "title": "New Form",
  "description": "Form description",
  "questions": [
    {
      "id": "q1",
      "type": "short_answer",
      "question": "What is your name?",
      "required": true,
      "order": 0
    }
  ],
  "settings": {
    "allow_multiple_submissions": false,
    "show_progress_bar": true
  },
  "status": "DRAFT"
}
```

#### Update Form
```http
PUT /api/forms/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "PUBLISHED"
}
```

#### Delete Form
```http
DELETE /api/forms/{id}
```

### Responses API

#### Get Responses
```http
GET /api/forms/{id}/responses?page=1&limit=50
```

**Response:**
```json
{
  "responses": [
    {
      "id": "uuid",
      "respondent_name": "John Doe",
      "respondent_email": "john@example.com",
      "answers": {
        "q1": "Answer 1",
        "q2": ["Option A", "Option B"]
      },
      "submitted_at": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

#### Submit Response
```http
POST /api/forms/{id}/responses
Content-Type: application/json

{
  "answers": {
    "q1": "My answer",
    "q2": "Option A",
    "q3": ["Option 1", "Option 2"]
  },
  "respondent_email": "user@example.com",
  "respondent_name": "User Name"
}
```

### Statistics API

#### Get Statistics
```http
GET /api/forms/{id}/statistics
```

**Response:**
```json
{
  "form_id": "uuid",
  "form_title": "Form Title",
  "total_responses": 42,
  "completion_rate": 100,
  "question_statistics": [
    {
      "question_id": "q1",
      "question_type": "multiple_choice",
      "question_text": "Question?",
      "total_responses": 42,
      "statistics": {
        "response_count": 42,
        "response_rate": "100.00",
        "options": [
          {
            "option": "Option A",
            "count": 30,
            "percentage": "71.43"
          }
        ],
        "mode": "Option A"
      }
    }
  ],
  "time_statistics": {
    "first_response": "2025-01-01T00:00:00Z",
    "latest_response": "2025-01-10T00:00:00Z",
    "average_daily_responses": 4.2
  }
}
```

### Export API

#### Export as CSV
```http
GET /api/forms/{id}/export?format=csv
```

Returns CSV file for download.

#### Export as JSON
```http
GET /api/forms/{id}/export?format=json
```

Returns JSON file for download.

---

## 🔐 Security & Permissions

### Role-Based Access Control

| Action | Admin | College Org | Course Org | Student |
|--------|-------|-------------|------------|---------|
| Create Forms | ✅ | ✅ | ✅ | ❌ |
| Edit Own Forms | ✅ | ✅ | ✅ | ❌ |
| Edit All Forms | ✅ | ❌ | ❌ | ❌ |
| View Statistics | ✅ (all) | ✅ (own) | ✅ (own) | ❌ |
| Delete Forms | ✅ (all) | ✅ (own) | ✅ (own) | ❌ |
| Fill Forms | ✅ | ✅ | ✅ | ✅ |

### Form Access Control

**Draft Forms:**
- Only visible to creator
- Not accessible via public URL

**Published Forms:**
- Accessible via public URL
- Can be filled by anyone (with link)
- Can require login via settings

**Closed Forms:**
- No longer accepting responses
- Statistics still accessible to creator
- Public URL shows "Form closed" message

---

## 🎨 UI Components

### FormBuilder
**Location:** `src/components/forms/FormBuilder.tsx`

**Props:**
```typescript
interface FormBuilderProps {
  formId?: string                    // For editing existing form
  initialData?: {
    title: string
    description?: string
    questions: Question[]
    settings?: FormSettings
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  }
  onSave?: (formId: string) => void  // Callback after save
  onCancel?: () => void              // Callback on cancel
}
```

**Features:**
- Drag-and-drop question reordering
- Live preview mode
- Settings panel
- Validation before save/publish

### FormsTable
**Location:** `src/components/forms/FormsTable.tsx`

**Features:**
- Paginated list of forms
- Search functionality
- Status filtering
- Quick actions (edit, view stats, duplicate, delete)
- Copy form link

### FormResponse
**Location:** `src/components/forms/FormResponse.tsx`

**Props:**
```typescript
interface FormResponseProps {
  formId: string
}
```

**Features:**
- Responsive form layout
- Real-time validation
- Progress tracking
- Success confirmation

### FormStatistics
**Location:** `src/components/forms/FormStatistics.tsx`

**Props:**
```typescript
interface FormStatisticsProps {
  formId: string
}
```

**Features:**
- Interactive charts (Recharts)
- Export functionality
- Real-time statistics
- Question-by-question breakdown

---

## 📊 Analytics Details

### Calculated Metrics

#### For All Question Types
- **Response Count**: Number of responses
- **Response Rate**: % of total respondents who answered

#### For Multiple Choice / Dropdown
- **Distribution**: Pie chart and bar chart
- **Mode**: Most selected option
- **Option Percentages**: % for each option

#### For Checkboxes
- **Selection Frequency**: How often each option was selected
- **Percentage**: % of respondents who selected each option

#### For Linear Scale
- **Average**: Mean of all responses
- **Median**: Middle value
- **Mode**: Most common value
- **Distribution**: Count per scale value
- **Min/Max**: Range of responses

#### For Text Responses
- **Response Count**: Number of responses
- **Average Word Count**: Mean words per response
- **All Responses**: Scrollable list

---

## 🚀 Installation & Setup

### 1. Run Database Migration

```bash
# Using psql
psql -U your_user -d your_database -f evaluation_forms_system_migration.sql

# Or using Supabase SQL Editor
# Copy contents of evaluation_forms_system_migration.sql
# Paste into SQL Editor and run
```

### 2. Install Dependencies (Already Done)

The following packages are already included:
- `recharts` - For charts and graphs
- `react-hook-form` - Form handling
- `zod` - Validation
- `@radix-ui/*` - UI components

### 3. Environment Variables

Ensure these are set in `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Access the System

- **Forms Dashboard**: http://localhost:3000/dashboard/forms
- **Create Form**: http://localhost:3000/dashboard/forms/new
- **Public Form**: http://localhost:3000/forms/{form-id}

---

## 🎯 Best Practices

### Creating Effective Forms

1. **Clear Titles**: Use descriptive, action-oriented titles
2. **Helpful Descriptions**: Provide context about the form's purpose
3. **Question Order**: Start with easy questions, progress to complex
4. **Required Fields**: Only mark essential questions as required
5. **Question Descriptions**: Add helper text for clarity
6. **Option Labels**: Use clear, mutually exclusive options
7. **Linear Scales**: Choose appropriate ranges (1-5, 1-10, etc.)
8. **Settings**: Configure based on your needs

### Managing Responses

1. **Regular Monitoring**: Check statistics dashboard frequently
2. **Export Data**: Regularly backup responses
3. **Close Forms**: Set deadlines or manually close when done
4. **Review Analytics**: Use insights to improve future forms

### Performance Tips

1. **Pagination**: Default 50 responses per page
2. **Analytics Caching**: Statistics cached for performance
3. **Search**: Use search to find specific forms quickly
4. **Status Filters**: Filter by DRAFT/PUBLISHED/CLOSED

---

## 🐛 Troubleshooting

### Form Not Saving
- Check all questions have text
- Ensure choice questions have at least one option
- Verify linear scale has min/max values

### Responses Not Submitting
- Check if form is published
- Verify form hasn't closed
- Check required fields are answered
- Ensure no network errors in console

### Statistics Not Loading
- Refresh the page
- Check if form has any responses
- Verify API endpoint is accessible

### Charts Not Rendering
- Ensure Recharts is installed
- Check browser console for errors
- Verify data format is correct

---

## 🔄 Differences from Original Evaluations System

The original system had **event evaluations** (tied to events). This new system provides:

1. **Standalone Forms**: Not tied to events
2. **More Question Types**: 9 types vs 4 types
3. **Advanced Statistics**: Comprehensive analytics with charts
4. **Export Functionality**: CSV and JSON export
5. **Form Settings**: More configuration options
6. **Public URLs**: Direct access to forms
7. **Better UX**: Modern, Google Forms-like interface

Both systems can coexist. Use:
- **Event Evaluations**: For event-specific feedback (certificates)
- **Forms System**: For surveys, feedback, registrations, etc.

---

## 📈 Future Enhancements

Potential features for future updates:

- [ ] Conditional Logic (skip questions based on answers)
- [ ] File Upload Questions
- [ ] Form Templates Library
- [ ] Branching/Sections
- [ ] Collaboration (multiple admins)
- [ ] Email Notifications
- [ ] Response Editing
- [ ] Anonymous vs Authenticated Responses
- [ ] Custom Themes
- [ ] QR Code Generation
- [ ] Integration with Events (link form to event)
- [ ] PDF Export of Statistics
- [ ] Scheduled Publishing
- [ ] Response Limits

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Check API responses in browser console
4. Verify database migrations ran successfully

---

## 📝 License

Part of the Student Management System project.

---

**Created:** November 2025
**Version:** 1.0.0
**Status:** Production Ready ✅

