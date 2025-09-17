## Student Management System — Functionality Documentation

### Quick Overview (Non-Technical)
This system helps a school or organization keep everything about students and events in one place.

- What it is: A website where admins manage students, events, fees, and certificates, and students check their information.
- Who uses it:
  - Admins: Teachers/staff who create events, track attendance, manage fees, and approve certificates.
  - Students: Learners who see their profile, attendance, fees, and download certificates.
- What you can do:
  - Manage Students: Add/edit students one by one or in bulk.
  - Run Events & Attendance: Create events, scan QR/barcodes, and see who attended.
  - Fees & Payments: Assign fees to the right students and record payments.
  - Certificates & Evaluations: Automatically create certificates for attendees; sometimes students must answer a short evaluation before downloading.
  - Reports & Analytics: See totals, trends, and export to Excel/CSV.
  - Notifications & Emails: Send updates like “certificate ready” or “please complete evaluation”.
- A typical day:
  1) Admin creates an event and sets who can attend (all students, a college, or a course).
  2) During the event, students are scanned in (or marked present).
  3) After the event, certificates are generated for those who attended.
  4) If an evaluation is required, students answer it first, then download their certificate.
  5) Admins can track attendance, fees, payments, and download reports.
- Privacy & Security: Students only see their own data. Admins control everything. Sign-in is required.

### Purpose
This document explains what the system does, who uses it, and how its core features work across frontend, backend, data model, authentication, and operations. It is meant for engineers, admins, and stakeholders to understand capabilities and flows at a glance.

### Audience and Roles
- **Admin**: Manages students, events, attendance, fees, certificates, evaluations, reports, and settings. Full access to dashboards and APIs.
- **Student**: Views personal profile, attendance history, certificates (subject to evaluation rules), and fee status.

## Platform Overview
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), React Hook Form + Zod, TanStack Query + Zustand.
- **Backend**: Next.js Route Handlers under `src/app/api/**` with PostgreSQL (Supabase) data access.
- **Auth**: NextAuth.js (credentials + Google OAuth with domain restriction), JWT sessions.
- **Storage/DB**: PostgreSQL (Supabase-managed). SQL migrations in repository.
- **Utilities**: Email notifications, CSV/Excel exports, QR code attendance scanning, React-PDF.

## Core Domains and Features

### 1) Students
- Create, edit, import (batch), list, search, and delete student records.
- Student profile includes `student_id`, name, email, phone, college, year level, course.
- Students are linked to users for authentication.

Key UI/Pages:
- Admin: `dashboard/students`, `dashboard/students/[id]`, `dashboard/students/new`.
- Student: `dashboard/profile` (personal info), `dashboard/students/[id]` (admin view).

Key API:
- `GET/POST /api/students`
- `GET/PUT/DELETE /api/students/[id]`
- `POST /api/students/batch-import`
- `GET /api/students/export`
- `GET /api/students/count`
- `GET /api/students/all`
- `GET /api/students/profile/[studentId]`

### 2) Events
- Create/manage events with scope: University-wide, College-wide, or Course-specific.
- Scope filters eligible attendees and affects attendance lists and reports.

Key UI/Pages:
- Admin: `dashboard/events`, `dashboard/events/new`, `dashboard/events/[id]`.
- Reports/Stats: `dashboard/events/[id]/stats`, `dashboard/events/[id]/report`.

Key API:
- `GET/POST /api/events`
- `GET/PUT/DELETE /api/events/[id]`
- `GET /api/events/[id]/stats`
- `GET /api/events/[id]/report`
- `POST /api/events/[id]/evaluation`

Scope Reference:
- See `EVENT_SCOPE_IMPLEMENTATION.md` and `migration_add_event_scope.sql` for schema and behavior.

### 3) Attendance
- Attendance records are tied to events and students, with QR/Barcode scanning support.
- History and stats endpoints provide per-event and per-student views.

Key UI/Pages:
- Admin: `dashboard/attendance`, `dashboard/attendance/manage`, `dashboard/attendance/[id]`, history and student views.

Key API:
- `POST /api/attendance/event/[eventId]/record` — add/update a record (time-in/out, status).
- `GET /api/attendance/event/[eventId]/records` — list records.
- `GET /api/attendance/event/[eventId]/stats` — basic stats.
- `POST /api/attendance/barcode-scan` — scan handler.
- `GET /api/students/attendance/[studentId]` — per-student attendance.

### 4) Fees and Payments
- Scoped fees (University/College/Course) with assignment previews and analytics.
- Record payments with method, reference, notes; track statuses and collection rates.

Key UI/Pages:
- Admin: `dashboard/fees`, `dashboard/fees/new`, `dashboard/fees/[id]`, `dashboard/fees/[id]/manage`.
- Student: `dashboard/fees/student` (personal fee view).

Key API:
- `GET/POST /api/fees`
- `GET/PUT/DELETE /api/fees/[id]`
- `GET /api/fees/[id]/students` — scoped student list for a fee.
- `GET /api/students/fees/[studentId]` — fees per student.
- `POST /api/payments` — record payment.

Reference: `FEE_MANAGEMENT_IMPLEMENTATION.md`, `migration_add_fee_scope.sql`.

### 5) Certificates and Templates
- Certificate templates with preview and per-template edit.
- Certificates generated for attended events; optionally locked until evaluation is completed.
- Unique certificate numbers and access logs; students can only access their own.

Key UI/Pages:
- Admin: `dashboard/certificates`, `dashboard/certificates/templates`, `dashboard/certificates/templates/new`, `dashboard/certificates/templates/[id]` (+ `/edit`).
- Student: `dashboard/certificates` (my certificates).

Key API:
- `GET/POST /api/certificate-templates`
- `GET/PUT/DELETE /api/certificate-templates/[id]` and `/sample`
- `GET/POST /api/certificates`
- `GET/DELETE/PATCH /api/certificates/[id]`
- `POST /api/certificates/generate` (bulk)
- `POST /api/certificates/update-accessibility`

Reference: `CERTIFICATE_EVALUATION_SYSTEM.md`, `SAMPLE_CERTIFICATE_DOWNLOAD_FEATURE.md`, `certificate_*_migration.sql`.

### 6) Evaluations
- Admins create evaluation templates (multiple question types) and link one evaluation per event.
- Students complete linked evaluation after attending; completion unlocks certificates if required.

Key UI/Pages:
- Admin: `dashboard/evaluations`, `dashboard/evaluations/new`, `dashboard/evaluations/[id]` (+ `/edit`, `/preview`, `/responses`).
- Event link: `dashboard/events/[id]/evaluation` (admin-side linking).
- Student: evaluation flow from certificates page.

Key API:
- `GET/POST /api/evaluations`
- `GET/PUT/DELETE /api/evaluations/[id]`
- `GET/POST /api/evaluations/responses` — submit/list responses.

Reference: `CERTIFICATE_EVALUATION_SYSTEM.md`.

## Frontend Dashboards and Flows

### Admin Dashboard
- Overview stats at `dashboard/page.tsx` and `src/components/dashboard/admin-dashboard.tsx`.
- Manage students, events, attendance, fees, certificates, evaluations, reports, notifications, and settings.

Common Admin Flows:
1. Create event → choose scope → track attendance → export/report.
2. Create scoped fee → preview impacted students → record payments → view analytics.
3. Create evaluation template → link to event (optional) → analyze responses.
4. Generate certificates (auto or bulk) → update accessibility → monitor downloads.

### Student Dashboard
- Profile, attendance history, fee status, and certificates.
- Certificate flow: attend event → if required, complete evaluation → download certificate.

### UI Libraries
- Reusable components under `src/components/ui/**` (buttons, dialogs, tables, inputs, toasts, etc.).
- QR/Barcode scanning on attendance; charts use Recharts; PDF via React-PDF.

## Backend APIs (High-Level Map)

### Authentication
- `GET/POST /api/auth/[...nextauth]` — NextAuth handlers (credentials + Google).

### Students
- `/api/students` (CRUD, export, count, batch import, all, profile).

### Events & Attendance
- `/api/events` (CRUD, stats, report, evaluation link).
- `/api/attendance/event/[eventId]/record|records|stats` (manage/get).
- `/api/attendance/barcode-scan` (scan handler).

### Certificates & Templates
- `/api/certificate-templates` (CRUD + sample preview, single template).
- `/api/certificates` (list/generate/view/update/delete, bulk generation, accessibility updates).

### Evaluations
- `/api/evaluations` (templates CRUD).
- `/api/evaluations/responses` (submit/list responses).

### Fees & Payments
- `/api/fees` (CRUD); `/api/fees/[id]/students` (scoped listing).
- `/api/students/fees/[studentId]` (per-student fees).
- `/api/payments` (payment record operations).

### Other
- `/api/dashboard/stats` — overall stats.
- `/api/notifications` — notifications CRUD and single view.
- `/api/upload/image` — file uploads (logos, etc.).
- `/api/system/db-status` — health check.

## Data Model Overview

Base schema (see `schema.sql`) and additional migration files introduce:
- `users`: authentication and role (`ADMIN`, `USER`/`STUDENT`).
- `students`: student profile linked to users.
- `events`: with `scope_type`, `scope_college`, `scope_course`, `require_evaluation`.
- `attendance`: event-student linkage and status; flags for `certificate_generated`, `evaluation_completed`.
- `fee_structures`: scoped fees and attributes (type, semester, school_year, is_active, soft-delete fields).
- `payments`: payment audit (method, reference, notes, soft-delete fields).
- `evaluations`, `event_evaluations`, `student_evaluation_responses`: evaluation templates, linking, and responses.
- `certificates`, `certificate_access_log`: certificate records, accessibility, and access tracking.

Indexes exist for high-traffic fields (e.g., students, events, attendance, payments) to maintain performance at scale.

## Authentication, Roles, and Permissions

### Session & Providers
- JWT sessions via NextAuth; providers include Credentials and Google OAuth.
- Google OAuth is restricted to the `student.buksu.edu.ph` domain. Only emails ending with this domain can sign in via Google, and only if a corresponding student exists.

### Role Enforcement
- Session token includes `role` and `studentId` fields; server routes check role and ownership.
- Students see only their own records (certificates, attendance, fees).
- Admins have full access to all components.

### Passwords
- Stored as bcrypt hashes; credentials flow verifies via secure comparison.

## Notifications, Uploads, and Utilities

### Notifications
- Notification endpoints under `/api/notifications` to store and fetch messages.
- Certificate and evaluation flows can trigger emails (see `src/lib/email.ts` and docs in certificate system guide).

### Uploads
- `/api/upload/image` handles image uploads (e.g., certificate logos). Files stored under `public/uploads/**`.

### Utilities
- `src/lib/utils.ts` provides UI helpers; other libs include `supabase.ts`, `db.ts`, `validations.ts`, `google-oauth-utils.ts`, and constants under `src/lib/constants/**`.

## Reports and Analytics
- Dashboard stats `/api/dashboard/stats`.
- Events: stats and report endpoints per event.
- Fees: collection rates and payment analytics in fee management pages.
- Export: CSV/Excel exports for students, attendance, and reports.

## Operations and Deployment

### Environment Variables (common)
- `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- For emails: `RESEND_API_KEY` if using Resend (optional).

### Local Development
- `npm install` → `npm run dev`.
- Configure `.env` per `README.md` and `QUICK_START.md`.

### Database
- Use `schema.sql` for base tables; apply additional migrations: `migration_add_event_scope.sql`, `migration_add_fee_scope.sql`, `certificate_evaluation_migration.sql`, `certificate_template_migration.sql`, `notification_system_migration.sql`, and attendance fixes if needed.

### Deployment
- Deploy to Vercel/Render; set environment variables and database connection.
- Health check: `/api/health` and `/api/system/db-status`.

## Troubleshooting and Maintenance

### Common Issues
- Auth: Verify OAuth credentials, callback URLs, domain restriction, and `.env` values.
- Database: Ensure migrations applied and tables/columns exist; check Supabase connection.
- QR/Camera: Requires HTTPS in production; test permissions.
- Certificates: Confirm attendance exists, evaluation completion (if required), and `is_accessible` flag.
- Emails: Verify API key and sender; check logs in `email.ts` handlers.

### Testing Hooks
- Scripts under `scripts/`: `test-attendance-fix.js`, `test-oauth-setup.js`, `test-timezone-fix.js`.
- Debug routes: `/api/debug-time`, `/api/test-email`, `/api/test-pdf` (if present).

### Data Integrity
- Use indexes and constraints defined in SQL; avoid manual DB edits without corresponding migrations.
- Prefer API routes over direct DB writes for auditability.

## Security Considerations
- JWT cookies are httpOnly and secure in production; CSRF handled by NextAuth.
- Zod validation on inputs; server-side authorization checks on sensitive routes.
- Students restricted to own data; admins only for destructive operations.

## Glossary
- **Scope (Event/Fee)**: The audience filter determining which students are eligible/assigned.
- **Evaluation**: A form students complete for an event; may gate certificate access.
- **Certificate Accessibility**: Whether a generated certificate is available for student download.

---
For quick setup and commands, see `README.md` and `QUICK_START.md`. For detailed domain implementations, see `EVENT_SCOPE_IMPLEMENTATION.md`, `FEE_MANAGEMENT_IMPLEMENTATION.md`, and `CERTIFICATE_EVALUATION_SYSTEM.md`.


