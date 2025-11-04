# Payment Receipt Upload and Approval Workflow

## Overview
This feature implements a complete payment receipt upload and approval workflow system for the Student Management System. Students can upload payment receipts, and administrators can review and approve/reject them based on role-based permissions.

## Features Implemented

### ✅ Student/User Side
1. **Receipt Upload Functionality**
   - "Upload Receipt" button on unpaid fees
   - Modal form for uploading receipt images (JPEG, PNG, GIF) or PDFs
   - File size validation (max 10MB)
   - Payment amount input validation
   - Real-time file preview for images

2. **Payment Status Display**
   - Status badges: PENDING APPROVAL, APPROVED, REJECTED, PAID, PARTIAL, UNPAID
   - Rejection reason display when payment is rejected
   - Receipt viewing capability in payment history
   - Status updates automatically after approval/rejection

3. **Payment History**
   - View all payment attempts with approval status
   - View receipt for each payment
   - See rejection reasons if applicable

### ✅ Admin/User Management Side
1. **Pending Payments Dashboard**
   - Accessible at `/dashboard/payments/pending`
   - Displays all submitted receipts waiting for approval
   - Shows: Student Name, Fee Type, College, Course, Upload Date, Receipt Preview
   - Filter by status: Pending Approval, Approved, Rejected, All
   - Search functionality
   - Pagination support

2. **Approval/Rejection Actions**
   - Approve button for each pending payment
   - Reject button with reason input
   - One-click approval
   - Rejection modal with required reason field

3. **Role-Based Access Control**
   - **System Admin (ADMIN)**: Can approve all payments across all colleges and courses
   - **College Organization (COLLEGE_ORG)**: Can approve college-wide and course-specific fees for their assigned college
   - **Course Organization (COURSE_ORG)**: Can only approve course-specific fees for their assigned course
   - Automatic filtering based on user role

## Database Changes

### Migration File: `payment_receipt_approval_migration.sql`

**New Columns in `payments` Table:**
- `receipt_url` (TEXT): URL path to uploaded receipt file
- `approval_status` (VARCHAR): PENDING_APPROVAL, APPROVED, or REJECTED
- `rejection_reason` (TEXT): Reason provided when rejecting payment
- `approved_by` (UUID): Reference to users table (admin who approved)
- `approved_at` (TIMESTAMP): When payment was approved
- `rejected_by` (UUID): Reference to users table (admin who rejected)
- `rejected_at` (TIMESTAMP): When payment was rejected
- `uploaded_at` (TIMESTAMP): When receipt was uploaded

**Indexes Created:**
- `idx_payments_approval_status`
- `idx_payments_approved_by`
- `idx_payments_rejected_by`

## API Endpoints

### 1. Upload Receipt
**POST** `/api/payments/upload-receipt`
- **Auth**: Students only (USER role)
- **Body**: FormData with `file`, `feeId`, `amount`
- **Response**: Payment record with receipt URL

### 2. Get Pending Payments
**GET** `/api/payments/pending`
- **Auth**: Admins only (ADMIN, COLLEGE_ORG, COURSE_ORG)
- **Query Params**: `status`, `page`, `limit`
- **Response**: Paginated list of payments with student and fee details

### 3. Approve/Reject Payment
**POST** `/api/payments/[id]/approve`
- **Auth**: Admins only
- **Body**: `{ action: 'APPROVE' | 'REJECT', rejectionReason?: string }`
- **Response**: Updated payment record

### 4. Updated Student Fees API
**GET** `/api/students/fees/[studentId]`
- Now includes `approvalStatus`, `receiptUrl`, `rejectionReason`, `uploadedAt` in payment data

## File Structure

### New Files Created
```
payment_receipt_approval_migration.sql
src/app/api/payments/upload-receipt/route.ts
src/app/api/payments/pending/route.ts
src/app/api/payments/[id]/approve/route.ts
src/app/dashboard/payments/pending/page.tsx
src/components/dashboard/receipt-upload-modal.tsx
src/components/dashboard/pending-payments.tsx
```

### Modified Files
```
src/app/api/students/fees/[studentId]/route.ts
src/components/dashboard/student-fees.tsx
```

## Workflow

### Student Payment Flow
1. Student views their fees on `/dashboard/fees/student`
2. For unpaid fees, clicks "Upload Receipt" button
3. Modal opens - student selects receipt file and enters payment amount
4. Receipt is uploaded to `/public/uploads/receipts/`
5. Payment record created with `approval_status = 'PENDING_APPROVAL'`
6. Status changes to "PENDING APPROVAL" badge
7. Upload button replaced with "Receipt uploaded, awaiting approval" message

### Admin Approval Flow
1. Admin navigates to `/dashboard/payments/pending`
2. Sees list of pending payments (filtered by their role permissions)
3. Clicks "View" to see receipt in new tab
4. Clicks "Approve" → Payment status changes to APPROVED, student's fee status updates to PAID
5. OR clicks "Reject" → Enters reason → Payment status changes to REJECTED, student sees rejection reason

### Role-Based Permissions
- **System Admin**: Sees all pending payments
- **College Org**: Sees payments for fees in their assigned college
- **Course Org**: Sees payments for course-specific fees in their assigned course

## File Storage

Receipts are stored in:
```
public/uploads/receipts/receipt_{student_id}_{fee_id}_{timestamp}_{random}.{ext}
```

Supported formats:
- Images: JPEG, JPG, PNG, GIF
- Documents: PDF

Max file size: 10MB

## Status Indicators

### Student View
- **PENDING APPROVAL**: Blue badge - Receipt uploaded, waiting for admin review
- **REJECTED**: Orange badge - Payment rejected with reason shown
- **PAID**: Green badge - Payment approved and completed
- **PARTIAL**: Yellow badge - Partial payment made
- **UNPAID**: Red badge - No payment submitted

### Admin View
- **Pending Approval**: Blue badge - Awaiting review
- **Approved**: Green badge - Payment approved, shows approver name
- **Rejected**: Red badge - Payment rejected, shows rejector name and reason

## Future Enhancements (Optional)

1. **Email Notifications**
   - Send email to student when payment is approved/rejected
   - Email admin when new receipt is uploaded

2. **Transaction Log**
   - Maintain detailed audit log of all approval/rejection actions
   - Track who approved/rejected and when

3. **Advanced Filters**
   - Filter by college, course, date range
   - Export pending payments to CSV

4. **Bulk Actions**
   - Approve multiple payments at once
   - Bulk rejection with same reason

## Testing Checklist

- [ ] Student can upload receipt for unpaid fee
- [ ] Receipt upload validates file type and size
- [ ] Payment status changes to PENDING_APPROVAL after upload
- [ ] Admin can view pending payments
- [ ] Admin can approve payment (one-click)
- [ ] Admin can reject payment with reason
- [ ] Student sees updated status after approval/rejection
- [ ] Role-based filtering works correctly
- [ ] College Org can only see their college's payments
- [ ] Course Org can only see their course's payments
- [ ] System Admin can see all payments
- [ ] Rejection reason displays to student
- [ ] Receipt can be viewed by both student and admin

## Notes

- Receipt files are stored in the `public` folder, making them accessible via direct URLs
- Approval workflow is integrated with existing payment system
- Backward compatibility: Existing PAID payments are automatically marked as APPROVED
- Payment status is updated to PAID only when approved by admin

