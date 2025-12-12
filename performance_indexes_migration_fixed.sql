-- ========================================
-- PERFORMANCE OPTIMIZATION INDEXES (FIXED)
-- ========================================
-- This version removes CONCURRENTLY to allow running in a transaction
-- For production with large tables, run indexes individually with CONCURRENTLY
-- Estimated execution time: 2-10 minutes (depending on table sizes)

-- NOTE: Regular CREATE INDEX will lock tables briefly.
-- For zero-downtime, see performance_indexes_migration_concurrent.sql

-- ========================================
-- PAYMENTS TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_payments_status 
  ON payments(status);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date 
  ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_payments_not_deleted 
  ON payments(deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_created_at 
  ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_fee_student_composite 
  ON payments(fee_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_unpaid 
  ON payments(student_id, fee_id, amount) 
  WHERE status = 'UNPAID' AND deleted_at IS NULL;

-- ========================================
-- EVENTS TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_events_status 
  ON events(status);

CREATE INDEX IF NOT EXISTS idx_events_scope_college 
  ON events(scope_college) 
  WHERE scope_college IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_scope_course 
  ON events(scope_course) 
  WHERE scope_course IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_created_at 
  ON events(created_at);

CREATE INDEX IF NOT EXISTS idx_events_updated_at 
  ON events(updated_at);

CREATE INDEX IF NOT EXISTS idx_events_scope_composite 
  ON events(scope_type, scope_college, scope_course) 
  WHERE scope_type IN ('COLLEGE_WIDE', 'COURSE_SPECIFIC');

CREATE INDEX IF NOT EXISTS idx_events_pending 
  ON events(created_at DESC, scope_type, scope_college) 
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_events_evaluation_id 
  ON events(evaluation_id) 
  WHERE evaluation_id IS NOT NULL;

-- ========================================
-- ATTENDANCE TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_attendance_status 
  ON attendance(status);

CREATE INDEX IF NOT EXISTS idx_attendance_created_at 
  ON attendance(created_at);

CREATE INDEX IF NOT EXISTS idx_attendance_time_in_out 
  ON attendance(time_in, time_out);

CREATE INDEX IF NOT EXISTS idx_attendance_event_student_time 
  ON attendance(event_id, student_id, time_in) 
  INCLUDE (time_out, status, created_at);

CREATE INDEX IF NOT EXISTS idx_attendance_evaluation_completed 
  ON attendance(evaluation_completed) 
  WHERE evaluation_completed = false;

CREATE INDEX IF NOT EXISTS idx_attendance_certificate_generated 
  ON attendance(certificate_generated) 
  WHERE certificate_generated = false;

-- ========================================
-- STUDENTS TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_students_year_level 
  ON students(year_level);

CREATE INDEX IF NOT EXISTS idx_students_archived 
  ON students(archived) 
  WHERE archived IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_created_at 
  ON students(created_at);

CREATE INDEX IF NOT EXISTS idx_students_email 
  ON students(email);

CREATE INDEX IF NOT EXISTS idx_students_college_course_year 
  ON students(college, course, year_level);

CREATE INDEX IF NOT EXISTS idx_students_active 
  ON students(college, course, year_level, created_at) 
  WHERE (archived IS NULL OR archived = false);

-- ========================================
-- FEE_STRUCTURES TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_fee_structures_is_active 
  ON fee_structures(is_active);

CREATE INDEX IF NOT EXISTS idx_fee_structures_not_deleted 
  ON fee_structures(deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_due_date 
  ON fee_structures(due_date);

CREATE INDEX IF NOT EXISTS idx_fee_structures_scope_type 
  ON fee_structures(scope_type);

CREATE INDEX IF NOT EXISTS idx_fee_structures_scope_college 
  ON fee_structures(scope_college) 
  WHERE scope_college IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_scope_course 
  ON fee_structures(scope_course) 
  WHERE scope_course IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_active_scope 
  ON fee_structures(is_active, scope_type, scope_college, scope_course) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_school_year_semester 
  ON fee_structures(school_year, semester);

-- ========================================
-- FORM_RESPONSES TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_form_responses_student_id 
  ON form_responses(student_id) 
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_responses_event_id 
  ON form_responses(event_id) 
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_responses_form_event_student 
  ON form_responses(form_id, event_id, student_id);

-- ========================================
-- NOTIFICATIONS TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_student_unread 
  ON notifications(student_id, created_at DESC) 
  WHERE is_read = false AND student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_expired 
  ON notifications(expires_at) 
  WHERE expires_at IS NOT NULL;

-- ========================================
-- CERTIFICATES TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_certificates_is_accessible 
  ON certificates(is_accessible);

CREATE INDEX IF NOT EXISTS idx_certificates_generated_at 
  ON certificates(generated_at);

CREATE INDEX IF NOT EXISTS idx_certificates_student_accessible 
  ON certificates(student_id, is_accessible, generated_at) 
  WHERE is_accessible = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_number_unique 
  ON certificates(certificate_number) 
  WHERE certificate_number IS NOT NULL;

-- ========================================
-- ORGANIZATION_FEEDBACK TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_organization_feedback_org_name 
  ON organization_feedback(org_name) 
  WHERE org_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organization_feedback_purpose 
  ON organization_feedback(purpose);

CREATE INDEX IF NOT EXISTS idx_organization_feedback_user_type 
  ON organization_feedback(user_type);

CREATE INDEX IF NOT EXISTS idx_organization_feedback_reaction_type 
  ON organization_feedback(reaction_type);

CREATE INDEX IF NOT EXISTS idx_organization_feedback_status 
  ON organization_feedback(status);

CREATE INDEX IF NOT EXISTS idx_organization_feedback_created_at 
  ON organization_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_feedback_rating 
  ON organization_feedback(overall_rating) 
  WHERE overall_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organization_feedback_composite 
  ON organization_feedback(org_name, purpose, user_type, reaction_type, created_at DESC);

-- ========================================
-- USERS TABLE ADDITIONAL INDEXES
-- ========================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique 
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_not_deleted 
  ON users(deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status_role 
  ON users(status, role) 
  WHERE status = 'ACTIVE';

-- ========================================
-- EVALUATION_FORMS TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_evaluation_forms_status_published 
  ON evaluation_forms(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_evaluation_forms_closes_at 
  ON evaluation_forms(closes_at) 
  WHERE status = 'PUBLISHED' AND closes_at IS NOT NULL;

-- ========================================
-- CERTIFICATE_ACCESS_LOG TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_certificate_access_log_cert_time 
  ON certificate_access_log(certificate_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificate_access_log_student 
  ON certificate_access_log(student_id, accessed_at DESC) 
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_certificate_access_log_access_type 
  ON certificate_access_log(access_type, accessed_at DESC);

-- ========================================
-- ANALYZE TABLES
-- ========================================

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
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Performance indexes created successfully!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total indexes created: 50+';
  RAISE NOTICE 'Tables analyzed and statistics updated.';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Indexes were created WITHOUT CONCURRENTLY';
  RAISE NOTICE 'Tables may have been briefly locked during creation.';
  RAISE NOTICE '';
  RAISE NOTICE 'To verify indexes:';
  RAISE NOTICE 'SELECT tablename, indexname FROM pg_indexes';
  RAISE NOTICE 'WHERE schemaname = ''public'' AND indexname LIKE ''idx_%%''';
  RAISE NOTICE 'ORDER BY tablename, indexname;';
  RAISE NOTICE '================================================';
END $$;

