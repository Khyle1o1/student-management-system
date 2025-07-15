# Certificate and Evaluation System Implementation

## 🎯 Overview

This implementation adds a comprehensive certificate and evaluation system to the Student Management System. It includes automatic certificate generation, conditional release based on evaluations, email notifications, and detailed tracking.

## ✨ Features Implemented

### 1. Certificate Generation & Conditional Release
- ✅ **Automatic Generation**: Certificates are automatically generated for students marked as present
- ✅ **Conditional Access**: Certificates are only accessible after evaluation completion (if required)
- ✅ **Unique Certificate Numbers**: Each certificate gets a unique identifier
- ✅ **Access Control**: Students can only access their own certificates

### 2. Evaluation System (Admin Side)
- ✅ **Evaluation Creation**: Admins can create evaluation templates with multiple question types
- ✅ **Question Types**: Support for multiple choice, rating, text, and boolean questions
- ✅ **Event Integration**: Link evaluations to events during creation
- ✅ **Template Management**: Save evaluations as reusable templates

### 3. Student Flow
- ✅ **Evaluation Submission**: Students complete evaluations after attending events
- ✅ **Response Validation**: Ensures all required questions are answered
- ✅ **Certificate Unlock**: Certificates become accessible after evaluation submission
- ✅ **Access Tracking**: All certificate views/downloads are logged

### 4. Email Notifications
- ✅ **Attendance Confirmation**: Sent when students are marked present
- ✅ **Evaluation Reminders**: Notify students about pending evaluations
- ✅ **Certificate Ready**: Alert when certificates become available
- ✅ **Responsive Design**: Beautiful HTML emails with proper styling

### 5. Administrative Dashboard
- ✅ **Bulk Certificate Generation**: Generate certificates for all attendees
- ✅ **Evaluation Analytics**: View response statistics and completion rates
- ✅ **Access Monitoring**: Track certificate downloads and views
- ✅ **Status Management**: Monitor evaluation completion and certificate accessibility

## 🏗️ Database Schema

### New Tables Added

```sql
-- Evaluation templates and forms
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL, -- Store questions as JSON
    is_template BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Link events to evaluations
CREATE TABLE event_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id) -- One evaluation per event
);

-- Student evaluation responses
CREATE TABLE student_evaluation_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
    responses JSONB NOT NULL, -- Store responses as JSON
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, student_id) -- One response per student per event
);

-- Certificate metadata
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) DEFAULT 'PARTICIPATION',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_accessible BOOLEAN DEFAULT false, -- Only accessible after evaluation completion
    file_path TEXT, -- Path to generated PDF
    certificate_number VARCHAR(100) UNIQUE, -- Unique certificate identifier
    UNIQUE(event_id, student_id) -- One certificate per student per event
);

-- Certificate access tracking
CREATE TABLE certificate_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id),
    access_type VARCHAR(50) NOT NULL, -- 'VIEW' or 'DOWNLOAD'
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);
```

### Updated Tables

```sql
-- Added evaluation requirement to events
ALTER TABLE events ADD COLUMN require_evaluation BOOLEAN DEFAULT false;

-- Added tracking fields to attendance
ALTER TABLE attendance ADD COLUMN certificate_generated BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN evaluation_completed BOOLEAN DEFAULT false;
```

## 🔄 Workflow

### 1. Event Creation (Admin)
1. Admin creates an event
2. Optionally enables "Require Evaluation"
3. If evaluation required, selects or creates an evaluation template
4. Event is linked to evaluation automatically

### 2. Student Attendance
1. Student attends event and is marked present
2. Certificate is automatically generated
3. Certificate accessibility depends on evaluation requirement:
   - **No evaluation required**: Certificate immediately accessible
   - **Evaluation required**: Certificate locked until evaluation completion
4. Email notification sent to student

### 3. Evaluation Process (If Required)
1. Student receives email with evaluation link
2. Student completes evaluation form
3. System validates all required responses
4. Evaluation submission unlocks certificate
5. Certificate availability email sent

### 4. Certificate Access
1. Student can view/download certificate from dashboard
2. All access attempts are logged
3. Certificate includes unique number and event details

## 📡 API Endpoints

### Evaluations
- `GET /api/evaluations` - List evaluation templates
- `POST /api/evaluations` - Create new evaluation
- `GET /api/evaluations/[id]` - Get specific evaluation
- `PUT /api/evaluations/[id]` - Update evaluation
- `DELETE /api/evaluations/[id]` - Delete evaluation

### Evaluation Responses
- `GET /api/evaluations/responses` - List responses (filtered by user role)
- `POST /api/evaluations/responses` - Submit student response

### Certificates
- `GET /api/certificates` - List certificates (filtered by user role)
- `POST /api/certificates` - Generate certificate (admin only)
- `POST /api/certificates/generate` - Bulk generate for event
- `GET /api/certificates/[id]` - View/download certificate
- `PATCH /api/certificates/[id]` - Update certificate (admin only)
- `DELETE /api/certificates/[id]` - Delete certificate (admin only)

## 🎨 Frontend Components

### Admin Components (To Be Created)
- **Evaluation Creator**: Form for creating evaluation templates
- **Event Form Extension**: Add evaluation requirement option
- **Certificate Dashboard**: View and manage certificates
- **Analytics Dashboard**: Evaluation and certificate statistics

### Student Components (To Be Created)
- **Evaluation Form**: Complete event evaluations
- **Certificate Gallery**: View accessible certificates
- **Dashboard Integration**: Show pending evaluations and certificates

## 📧 Email System

### Email Templates
All emails use responsive HTML design with:
- Modern gradient headers
- Clear call-to-action buttons
- Status indicators (evaluation required, certificate ready)
- Professional branding

### Email Types
1. **Attendance Confirmation**
   - Sent when student marked present
   - Includes evaluation link if required
   - Shows certificate status

2. **Evaluation Reminder**
   - Sent to students with pending evaluations
   - Emphasizes certificate unlock benefit
   - Can include deadline information

3. **Certificate Available**
   - Sent when certificate becomes accessible
   - Direct download link
   - Certificate number included

## 🔧 Configuration

### Environment Variables
```env
# Email configuration (using Resend)
RESEND_API_KEY=your_resend_api_key

# Application URLs for email links
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Email From Address
Update the from address in `src/lib/email.ts`:
```typescript
from: 'Student Management System <noreply@yourdomain.com>'
```

## 🚀 Getting Started

### 1. Database Migration
Run the migration to add all required tables:
```bash
# Apply the migration in your database
psql your_database < certificate_evaluation_migration.sql
```

### 2. Environment Setup
Add the email configuration to your `.env` file:
```env
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Test the System
1. Create an event with evaluation requirement enabled
2. Mark a student as present
3. Check that certificate is generated but not accessible
4. Complete the evaluation as the student
5. Verify certificate becomes accessible
6. Test email notifications (ensure RESEND_API_KEY is configured)

## 📊 System Flow Examples

### University-wide Event with Evaluation
```
1. Admin creates "Annual Conference" (University-wide, requires evaluation)
2. Admin links "Conference Feedback" evaluation template
3. 500 students attend and are marked present
4. 500 certificates generated (all locked)
5. Email sent to all 500 students
6. Students complete evaluation
7. Certificates unlock as evaluations are submitted
8. Final email sent when certificate ready
```

### College Event without Evaluation
```
1. Admin creates "Engineering Job Fair" (College-wide, no evaluation)
2. 50 engineering students attend
3. 50 certificates generated (all accessible)
4. Email sent with direct certificate download links
5. Students can immediately access certificates
```

## 📈 Analytics & Tracking

### Certificate Statistics
- Total certificates generated
- Accessibility rates (locked vs unlocked)
- Download/view counts per certificate
- Popular events by certificate generation

### Evaluation Analytics
- Response completion rates
- Average time to complete evaluations
- Question-level response analysis
- Event feedback trends

### Email Performance
- Delivery success rates
- Open and click-through rates (if supported by email provider)
- Email bounce and error tracking

## 🔒 Security Features

### Access Control
- Students can only access their own certificates and evaluations
- Admins have full access to all system components
- Certificate access requires proper authentication

### Data Validation
- All API inputs are validated using Zod schemas
- Evaluation responses validated against question requirements
- Certificate generation requires valid attendance records

### Audit Trail
- All certificate access attempts logged
- Evaluation submissions tracked with timestamps
- Administrative actions logged for accountability

## 🎯 Benefits

### For Students
- **Clear Process**: Know exactly what's required for certificates
- **Immediate Feedback**: Email notifications for each step
- **Easy Access**: Simple certificate download process
- **Secure Storage**: Certificates always available online

### For Administrators
- **Automated Process**: Certificates generated automatically
- **Quality Control**: Evaluation requirement ensures feedback
- **Analytics**: Detailed insights into event success
- **Compliance**: Complete audit trail for all actions

### For the Institution
- **Professional Image**: High-quality certificate system
- **Data Collection**: Valuable event feedback through evaluations
- **Efficiency**: Reduced manual certificate processing
- **Scalability**: Handles large events automatically

## 🔧 Customization Options

### Certificate Templates
- Customize certificate design (future enhancement)
- Add institutional branding
- Include additional metadata fields

### Evaluation Types
- Add new question types (file upload, matrix questions)
- Implement conditional logic in evaluations
- Create evaluation workflows

### Email Customization
- Modify email templates in `src/lib/email.ts`
- Add additional notification types
- Customize email branding and styling

### Access Rules
- Implement role-based certificate access
- Add certificate expiration dates
- Create certificate categories

## 🐛 Troubleshooting

### Common Issues

1. **Certificates not generating**
   - Check attendance records have `time_out` values
   - Verify event scope matches student eligibility
   - Check database migration was applied

2. **Emails not sending**
   - Verify `RESEND_API_KEY` is configured
   - Check email domain verification in Resend
   - Review console logs for error messages

3. **Evaluation not unlocking certificate**
   - Ensure all required questions were answered
   - Check evaluation-event linking in database
   - Verify evaluation completion status in attendance table

4. **Student can't access certificate**
   - Check `is_accessible` flag in certificates table
   - Verify student completed required evaluation
   - Ensure student has proper authentication

### Debugging Tips
- Enable detailed logging in API endpoints
- Check browser network tab for API errors
- Use database queries to verify data integrity
- Test email functionality with admin accounts first

## 🎉 Success Metrics

### Implementation Success Indicators
- ✅ All database tables created without errors
- ✅ API endpoints respond correctly
- ✅ Email notifications delivered successfully
- ✅ Certificate generation works for test events
- ✅ Student evaluation submission process works
- ✅ Certificate access control functions properly

### Operational Success Metrics
- **Evaluation Completion Rate**: Target 85%+ of attendees complete evaluations
- **Certificate Access Rate**: Target 90%+ of students access their certificates
- **Email Delivery Rate**: Target 95%+ successful email deliveries
- **System Performance**: Certificate generation under 10 seconds for 100+ students
- **User Satisfaction**: Positive feedback on the certificate and evaluation process

This system provides a comprehensive solution for event attendance certification with quality control through evaluations, ensuring both institutional requirements and student satisfaction are met. 