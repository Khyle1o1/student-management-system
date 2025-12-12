-- ========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ========================================
-- Run this migration to add all missing critical indexes
-- Estimated execution time: 5-15 minutes (depending on table sizes)
-- Use CONCURRENTLY to avoid locking tables

-- ========================================
-- PAYMENTS TABLE INDEXES
-- ========================================

-- Status index (heavily filtered)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status 
  ON payments(status);

-- Payment date index (used in reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_date 
  ON payments(payment_date);

-- Deleted_at partial index (most queries filter this)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_not_deleted 
  ON payments(deleted_at) 
  WHERE deleted_at IS NULL;

-- Created_at for sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at 
  ON payments(created_at);

-- Composite index for fee-student queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_fee_student_composite 
  ON payments(fee_id, student_id, status);

-- Partial index for unpaid payments (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_unpaid 
  ON payments(student_id, fee_id, amount) 
  WHERE status = 'UNPAID' AND deleted_at IS NULL;

-- ========================================
-- EVENTS TABLE INDEXES
-- ========================================

-- Status index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_status 
  ON events(status);

-- Scope college index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_scope_college 
  ON events(scope_college) 
  WHERE scope_college IS NOT NULL;

-- Scope course index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_scope_course 
  ON events(scope_course) 
  WHERE scope_course IS NOT NULL;

-- Created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_created_at 
  ON events(created_at);

-- Updated_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_updated_at 
  ON events(updated_at);

-- Composite index for scope filtering (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_scope_composite 
  ON events(scope_type, scope_college, scope_course) 
  WHERE scope_type IN ('COLLEGE_WIDE', 'COURSE_SPECIFIC');

-- Partial index for pending events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_pending 
  ON events(created_at DESC, scope_type, scope_college) 
  WHERE status = 'PENDING';

-- Evaluation ID index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_evaluation_id 
  ON events(evaluation_id) 
  WHERE evaluation_id IS NOT NULL;

-- ========================================
-- ATTENDANCE TABLE INDEXES
-- ========================================

-- Status index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status 
  ON attendance(status);

-- Created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_created_at 
  ON attendance(created_at);

-- Time in/out composite
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_time_in_out 
  ON attendance(time_in, time_out);

-- Composite for common joins (event + student + time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_event_student_time 
  ON attendance(event_id, student_id, time_in) 
  INCLUDE (time_out, status, created_at);

-- Evaluation completed index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_evaluation_completed 
  ON attendance(evaluation_completed) 
  WHERE evaluation_completed = false;

-- Certificate generated index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_certificate_generated 
  ON attendance(certificate_generated) 
  WHERE certificate_generated = false;

-- ========================================
-- STUDENTS TABLE INDEXES
-- ========================================

-- Year level index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_year_level 
  ON students(year_level);

-- Archived index (frequently filtered)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_archived 
  ON students(archived) 
  WHERE archived IS NOT NULL;

-- Created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_created_at 
  ON students(created_at);

-- Email index (for lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_email 
  ON students(email);

-- Composite for common filters (college + course + year)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_college_course_year 
  ON students(college, course, year_level);

-- Partial index for active students (most queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_active 
  ON students(college, course, year_level, created_at) 
  WHERE (archived IS NULL OR archived = false);

-- ========================================
-- FEE_STRUCTURES TABLE INDEXES
-- ========================================

-- Is_active index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_is_active 
  ON fee_structures(is_active);

-- Deleted_at partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_not_deleted 
  ON fee_structures(deleted_at) 
  WHERE deleted_at IS NULL;

-- Due_date index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_due_date 
  ON fee_structures(due_date);

-- Scope_type index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_scope_type 
  ON fee_structures(scope_type);

-- Scope_college index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_scope_college 
  ON fee_structures(scope_college) 
  WHERE scope_college IS NOT NULL;

-- Scope_course index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_scope_course 
  ON fee_structures(scope_course) 
  WHERE scope_course IS NOT NULL;

-- Composite for active scoped queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_active_scope 
  ON fee_structures(is_active, scope_type, scope_college, scope_course) 
  WHERE deleted_at IS NULL;

-- School year + semester index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_school_year_semester 
  ON fee_structures(school_year, semester);

-- ========================================
-- FORM_RESPONSES TABLE INDEXES
-- ========================================

-- Student_id index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_student_id 
  ON form_responses(student_id) 
  WHERE student_id IS NOT NULL;

-- Event_id index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_event_id 
  ON form_responses(event_id) 
  WHERE event_id IS NOT NULL;

-- Composite for event evaluations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_form_event_student 
  ON form_responses(form_id, event_id, student_id);

-- ========================================
-- NOTIFICATIONS TABLE INDEXES
-- ========================================

-- User unread notifications (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE is_read = false;

-- Student unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_student_unread 
  ON notifications(student_id, created_at DESC) 
  WHERE is_read = false AND student_id IS NOT NULL;

-- Type index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type 
  ON notifications(type, created_at DESC);

-- Expires_at partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_expired 
  ON notifications(expires_at) 
  WHERE expires_at IS NOT NULL;

-- ========================================
-- CERTIFICATES TABLE INDEXES
-- ========================================

-- Is_accessible index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_is_accessible 
  ON certificates(is_accessible);

-- Generated_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_generated_at 
  ON certificates(generated_at);

-- Composite for student accessible certificates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_student_accessible 
  ON certificates(student_id, is_accessible, generated_at) 
  WHERE is_accessible = true;

-- Certificate number unique index (if not exists)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_number_unique 
  ON certificates(certificate_number) 
  WHERE certificate_number IS NOT NULL;

-- ========================================
-- ORGANIZATION_FEEDBACK TABLE INDEXES
-- ========================================

-- Org_name index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_org_name 
  ON organization_feedback(org_name) 
  WHERE org_name IS NOT NULL;

-- Purpose index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_purpose 
  ON organization_feedback(purpose);

-- User_type index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_user_type 
  ON organization_feedback(user_type);

-- Reaction_type index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_reaction_type 
  ON organization_feedback(reaction_type);

-- Status index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_status 
  ON organization_feedback(status);

-- Created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_created_at 
  ON organization_feedback(created_at DESC);

-- Overall_rating index (for analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_rating 
  ON organization_feedback(overall_rating) 
  WHERE overall_rating IS NOT NULL;

-- Composite for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_composite 
  ON organization_feedback(org_name, purpose, user_type, reaction_type, created_at DESC);

-- ========================================
-- USERS TABLE ADDITIONAL INDEXES
-- ========================================

-- Email unique index (should already exist, but verify)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_unique 
  ON users(email);

-- Deleted_at partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_not_deleted 
  ON users(deleted_at) 
  WHERE deleted_at IS NULL;

-- Status + role composite
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_role 
  ON users(status, role) 
  WHERE status = 'ACTIVE';

-- ========================================
-- EVALUATION_FORMS TABLE INDEXES
-- ========================================

-- Status + published_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluation_forms_status_published 
  ON evaluation_forms(status, published_at DESC);

-- Closes_at for active forms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluation_forms_closes_at 
  ON evaluation_forms(closes_at) 
  WHERE status = 'PUBLISHED' AND closes_at IS NOT NULL;

-- ========================================
-- CERTIFICATE_ACCESS_LOG TABLE INDEXES
-- ========================================

-- Certificate_id + accessed_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificate_access_log_cert_time 
  ON certificate_access_log(certificate_id, accessed_at DESC);

-- Student_id index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificate_access_log_student 
  ON certificate_access_log(student_id, accessed_at DESC) 
  WHERE student_id IS NOT NULL;

-- Access_type index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificate_access_log_access_type 
  ON certificate_access_log(access_type, accessed_at DESC);

-- ========================================
-- VERIFICATION & STATISTICS
-- ========================================

-- After running this migration, verify indexes were created:
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- Check index usage after a few days:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched,
--   pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- ========================================
-- NOTES
-- ========================================
-- 1. All indexes use CONCURRENTLY to avoid table locks
-- 2. Partial indexes save space and improve performance
-- 3. Composite indexes support common multi-column queries
-- 4. INCLUDE clause adds extra columns without indexing them
-- 5. Monitor index usage and remove unused ones after testing

ANALYZE students;
ANALYZE events;
ANALYZE attendance;
ANALYZE payments;
ANALYZE fee_structures;
ANALYZE form_responses;
ANALYZE certificates;
ANALYZE notifications;
ANALYZE organization_feedback;
ANALYZE users;
ANALYZE evaluation_forms;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes migration completed successfully!';
  RAISE NOTICE 'Run ANALYZE on your tables to update statistics.';
  RAISE NOTICE 'Monitor query performance and index usage over the next few days.';
END $$;

