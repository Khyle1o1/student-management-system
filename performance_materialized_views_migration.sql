-- ========================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ========================================
-- Creates pre-computed views for expensive aggregations
-- Significantly speeds up dashboard and report queries

-- ========================================
-- 1. STUDENT STATISTICS BY COLLEGE
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_stats_by_college AS
SELECT 
  college,
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE year_level = 1) as year_1_count,
  COUNT(*) FILTER (WHERE year_level = 2) as year_2_count,
  COUNT(*) FILTER (WHERE year_level = 3) as year_3_count,
  COUNT(*) FILTER (WHERE year_level = 4) as year_4_count,
  COUNT(*) FILTER (WHERE archived = true) as archived_count,
  COUNT(*) FILTER (WHERE archived IS NULL OR archived = false) as active_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_this_week,
  MAX(created_at) as last_student_added,
  NOW() as last_refreshed
FROM students
WHERE deleted_at IS NULL
GROUP BY college;

CREATE UNIQUE INDEX idx_mv_student_stats_college 
  ON mv_student_stats_by_college(college);

COMMENT ON MATERIALIZED VIEW mv_student_stats_by_college IS 
  'Pre-computed student statistics grouped by college. Refresh every 5-15 minutes.';

-- ========================================
-- 2. STUDENT STATISTICS BY COURSE
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_stats_by_course AS
SELECT 
  college,
  course,
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE year_level = 1) as year_1_count,
  COUNT(*) FILTER (WHERE year_level = 2) as year_2_count,
  COUNT(*) FILTER (WHERE year_level = 3) as year_3_count,
  COUNT(*) FILTER (WHERE year_level = 4) as year_4_count,
  COUNT(*) FILTER (WHERE archived = true) as archived_count,
  COUNT(*) FILTER (WHERE archived IS NULL OR archived = false) as active_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month,
  AVG(year_level) as avg_year_level,
  NOW() as last_refreshed
FROM students
WHERE deleted_at IS NULL
GROUP BY college, course;

CREATE UNIQUE INDEX idx_mv_student_stats_course 
  ON mv_student_stats_by_course(college, course);

CREATE INDEX idx_mv_student_stats_course_college 
  ON mv_student_stats_by_course(college);

COMMENT ON MATERIALIZED VIEW mv_student_stats_by_course IS 
  'Pre-computed student statistics grouped by college and course.';

-- ========================================
-- 3. EVENT STATISTICS
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_event_stats AS
SELECT 
  e.id as event_id,
  e.title,
  e.date,
  e.scope_type,
  e.scope_college,
  e.scope_course,
  e.status,
  e.attendance_type,
  e.require_evaluation,
  
  -- Attendance stats
  COUNT(DISTINCT a.student_id) as total_unique_attendees,
  COUNT(DISTINCT a.student_id) FILTER (
    WHERE a.time_in IS NOT NULL 
    AND (e.attendance_type = 'IN_ONLY' OR (e.attendance_type = 'IN_OUT' AND a.time_out IS NOT NULL))
  ) as completed_attendance_count,
  COUNT(a.id) as total_attendance_records,
  COUNT(a.id) FILTER (WHERE a.time_in IS NOT NULL) as checked_in_count,
  COUNT(a.id) FILTER (WHERE a.time_out IS NOT NULL) as checked_out_count,
  
  -- Certificate stats
  COUNT(DISTINCT c.id) as certificates_generated,
  COUNT(DISTINCT c.id) FILTER (WHERE c.is_accessible = true) as certificates_accessible,
  
  -- Evaluation stats
  COUNT(DISTINCT fr.id) as evaluations_completed,
  COUNT(DISTINCT fr.student_id) as unique_evaluators,
  
  -- Eligible students calculation (approximate)
  CASE 
    WHEN e.scope_type = 'UNIVERSITY_WIDE' THEN (
      SELECT COUNT(*) FROM students WHERE archived IS NULL OR archived = false
    )
    WHEN e.scope_type = 'COLLEGE_WIDE' THEN (
      SELECT COUNT(*) 
      FROM students 
      WHERE college = e.scope_college 
      AND (archived IS NULL OR archived = false)
    )
    WHEN e.scope_type = 'COURSE_SPECIFIC' THEN (
      SELECT COUNT(*) 
      FROM students 
      WHERE course = e.scope_course 
      AND (archived IS NULL OR archived = false)
    )
    ELSE 0
  END as estimated_eligible_students,
  
  NOW() as last_refreshed
FROM events e
LEFT JOIN attendance a ON e.id = a.event_id
LEFT JOIN certificates c ON e.id = c.event_id
LEFT JOIN form_responses fr ON e.id = fr.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.title, e.date, e.scope_type, e.scope_college, e.scope_course, 
         e.status, e.attendance_type, e.require_evaluation;

CREATE UNIQUE INDEX idx_mv_event_stats_id ON mv_event_stats(event_id);
CREATE INDEX idx_mv_event_stats_date ON mv_event_stats(date DESC);
CREATE INDEX idx_mv_event_stats_scope ON mv_event_stats(scope_type, scope_college, scope_course);
CREATE INDEX idx_mv_event_stats_status ON mv_event_stats(status);

COMMENT ON MATERIALIZED VIEW mv_event_stats IS 
  'Comprehensive event statistics including attendance, certificates, and evaluations.';

-- ========================================
-- 4. PAYMENT STATISTICS BY FEE
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_payment_stats_by_fee AS
SELECT 
  fs.id as fee_id,
  fs.name as fee_name,
  fs.amount as fee_amount,
  fs.due_date,
  fs.scope_type,
  fs.scope_college,
  fs.scope_course,
  fs.is_active,
  
  -- Payment counts
  COUNT(p.id) as total_payments,
  COUNT(p.id) FILTER (WHERE p.status = 'PAID') as paid_count,
  COUNT(p.id) FILTER (WHERE p.status = 'UNPAID') as unpaid_count,
  COUNT(p.id) FILTER (WHERE p.status = 'PENDING') as pending_count,
  COUNT(DISTINCT p.student_id) as unique_students,
  
  -- Financial stats
  SUM(p.amount) FILTER (WHERE p.status = 'PAID') as total_collected,
  SUM(p.amount) FILTER (WHERE p.status = 'UNPAID') as total_outstanding,
  SUM(p.amount) FILTER (WHERE p.status = 'PENDING') as total_pending,
  AVG(p.amount) FILTER (WHERE p.status = 'PAID') as avg_payment_amount,
  
  -- Percentage calculations
  CASE 
    WHEN COUNT(p.id) > 0 THEN 
      ROUND((COUNT(p.id) FILTER (WHERE p.status = 'PAID')::NUMERIC / COUNT(p.id)::NUMERIC * 100), 2)
    ELSE 0 
  END as payment_rate_percent,
  
  -- Time-based stats
  COUNT(p.id) FILTER (
    WHERE p.status = 'PAID' 
    AND p.payment_date >= CURRENT_DATE - INTERVAL '30 days'
  ) as paid_last_30_days,
  COUNT(p.id) FILTER (
    WHERE p.status = 'PAID' 
    AND p.payment_date >= CURRENT_DATE - INTERVAL '7 days'
  ) as paid_last_7_days,
  
  NOW() as last_refreshed
FROM fee_structures fs
LEFT JOIN payments p ON fs.id = p.fee_id AND p.deleted_at IS NULL
WHERE fs.deleted_at IS NULL
GROUP BY fs.id, fs.name, fs.amount, fs.due_date, fs.scope_type, 
         fs.scope_college, fs.scope_course, fs.is_active;

CREATE UNIQUE INDEX idx_mv_payment_stats_fee ON mv_payment_stats_by_fee(fee_id);
CREATE INDEX idx_mv_payment_stats_scope ON mv_payment_stats_by_fee(scope_type, scope_college);
CREATE INDEX idx_mv_payment_stats_active ON mv_payment_stats_by_fee(is_active);
CREATE INDEX idx_mv_payment_stats_due_date ON mv_payment_stats_by_fee(due_date);

COMMENT ON MATERIALIZED VIEW mv_payment_stats_by_fee IS 
  'Payment statistics aggregated by fee structure.';

-- ========================================
-- 5. DAILY DASHBOARD SUMMARY
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_dashboard_summary AS
SELECT 
  CURRENT_DATE as summary_date,
  
  -- Student metrics
  (SELECT COUNT(*) FROM students WHERE archived IS NULL OR archived = false) as total_active_students,
  (SELECT COUNT(*) FROM students WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as students_added_30d,
  (SELECT COUNT(*) FROM students WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as students_added_7d,
  (SELECT COUNT(*) FROM students WHERE archived = true) as total_archived_students,
  
  -- Event metrics
  (SELECT COUNT(*) FROM events WHERE date >= CURRENT_DATE AND status != 'CANCELLED') as upcoming_events,
  (SELECT COUNT(*) FROM events WHERE date = CURRENT_DATE AND status != 'CANCELLED') as events_today,
  (SELECT COUNT(*) FROM events WHERE status = 'PENDING') as pending_events,
  (SELECT COUNT(*) FROM events WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as events_created_30d,
  
  -- Payment metrics
  (SELECT COUNT(*) FROM payments WHERE status = 'UNPAID' AND deleted_at IS NULL) as total_unpaid_payments,
  (SELECT COUNT(*) FROM payments WHERE status = 'PENDING' AND deleted_at IS NULL) as total_pending_payments,
  (SELECT COUNT(*) FROM payments WHERE status = 'PAID' AND deleted_at IS NULL) as total_paid_payments,
  (SELECT SUM(amount) FROM payments WHERE status = 'PAID' AND deleted_at IS NULL) as total_revenue,
  (SELECT SUM(amount) FROM payments WHERE status = 'PAID' AND payment_date >= CURRENT_DATE - INTERVAL '30 days') as revenue_30d,
  (SELECT SUM(amount) FROM payments WHERE status = 'UNPAID' AND deleted_at IS NULL) as total_outstanding,
  
  -- Certificate metrics
  (SELECT COUNT(*) FROM certificates WHERE is_accessible = true) as total_accessible_certificates,
  (SELECT COUNT(*) FROM certificates WHERE generated_at >= CURRENT_DATE - INTERVAL '7 days') as certificates_generated_7d,
  
  -- Notification metrics
  (SELECT COUNT(*) FROM notifications WHERE is_read = false) as total_unread_notifications,
  (SELECT COUNT(*) FROM notifications WHERE created_at >= CURRENT_DATE) as notifications_created_today,
  
  -- Feedback metrics
  (SELECT COUNT(*) FROM organization_feedback WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as feedback_30d,
  (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM organization_feedback WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as avg_rating_30d,
  
  NOW() as last_refreshed;

COMMENT ON MATERIALIZED VIEW mv_daily_dashboard_summary IS 
  'Daily snapshot of all key metrics for the dashboard. Refresh every 5-15 minutes.';

-- ========================================
-- 6. ATTENDANCE RATE BY EVENT
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_rate_by_event AS
WITH eligible_students AS (
  SELECT 
    e.id as event_id,
    COUNT(CASE 
      WHEN e.scope_type = 'UNIVERSITY_WIDE' THEN s.id
      WHEN e.scope_type = 'COLLEGE_WIDE' AND s.college = e.scope_college THEN s.id
      WHEN e.scope_type = 'COURSE_SPECIFIC' AND s.course = e.scope_course THEN s.id
    END) as eligible_count
  FROM events e
  CROSS JOIN students s
  WHERE (s.archived IS NULL OR s.archived = false)
    AND e.deleted_at IS NULL
  GROUP BY e.id
),
attendance_counts AS (
  SELECT 
    event_id,
    COUNT(DISTINCT student_id) as attended_count
  FROM attendance
  WHERE time_in IS NOT NULL
  GROUP BY event_id
)
SELECT 
  e.id as event_id,
  e.title,
  e.date,
  e.scope_type,
  COALESCE(es.eligible_count, 0) as eligible_students,
  COALESCE(ac.attended_count, 0) as attended_students,
  CASE 
    WHEN COALESCE(es.eligible_count, 0) > 0 THEN 
      ROUND((COALESCE(ac.attended_count, 0)::NUMERIC / es.eligible_count::NUMERIC * 100), 2)
    ELSE 0
  END as attendance_rate_percent,
  NOW() as last_refreshed
FROM events e
LEFT JOIN eligible_students es ON e.id = es.event_id
LEFT JOIN attendance_counts ac ON e.id = ac.event_id
WHERE e.deleted_at IS NULL
ORDER BY e.date DESC;

CREATE UNIQUE INDEX idx_mv_attendance_rate_event ON mv_attendance_rate_by_event(event_id);
CREATE INDEX idx_mv_attendance_rate_date ON mv_attendance_rate_by_event(date DESC);

COMMENT ON MATERIALIZED VIEW mv_attendance_rate_by_event IS 
  'Attendance rates calculated for each event with eligible student counts.';

-- ========================================
-- REFRESH FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION refresh_performance_materialized_views()
RETURNS TABLE (
  view_name TEXT,
  refresh_status TEXT,
  refresh_time INTERVAL
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
BEGIN
  -- Refresh student stats by college
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_stats_by_college;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 
    'mv_student_stats_by_college'::TEXT, 
    'SUCCESS'::TEXT, 
    end_time - start_time;

  -- Refresh student stats by course
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_stats_by_course;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 
    'mv_student_stats_by_course'::TEXT, 
    'SUCCESS'::TEXT, 
    end_time - start_time;

  -- Refresh event stats
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_stats;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 
    'mv_event_stats'::TEXT, 
    'SUCCESS'::TEXT, 
    end_time - start_time;

  -- Refresh payment stats
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_stats_by_fee;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 
    'mv_payment_stats_by_fee'::TEXT, 
    'SUCCESS'::TEXT, 
    end_time - start_time;

  -- Refresh daily dashboard
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW mv_daily_dashboard_summary;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 
    'mv_daily_dashboard_summary'::TEXT, 
    'SUCCESS'::TEXT, 
    end_time - start_time;

  -- Refresh attendance rates
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_attendance_rate_by_event;
  end_time := clock_timestamp();
  RETURN QUERY SELECT 
    'mv_attendance_rate_by_event'::TEXT, 
    'SUCCESS'::TEXT, 
    end_time - start_time;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    'ERROR'::TEXT, 
    SQLERRM::TEXT, 
    INTERVAL '0';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_performance_materialized_views() IS 
  'Refreshes all performance materialized views and returns timing information.';

-- ========================================
-- SCHEDULED REFRESH (Optional - requires pg_cron)
-- ========================================

-- Uncomment if you have pg_cron installed:
-- 
-- -- Refresh every 5 minutes
-- SELECT cron.schedule(
--   'refresh-performance-views',
--   '*/5 * * * *',
--   'SELECT refresh_performance_materialized_views()'
-- );
--
-- -- View scheduled jobs:
-- SELECT * FROM cron.job;
--
-- -- View job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ========================================
-- MANUAL REFRESH INSTRUCTIONS
-- ========================================

-- To manually refresh all views:
-- SELECT * FROM refresh_performance_materialized_views();

-- To refresh a single view:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_stats;

-- To check last refresh time:
-- SELECT last_refreshed FROM mv_daily_dashboard_summary;

-- ========================================
-- INITIAL DATA POPULATION
-- ========================================

-- Populate views with initial data
SELECT * FROM refresh_performance_materialized_views();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Materialized views created and populated successfully!';
  RAISE NOTICE 'Set up a cron job or scheduled task to refresh views periodically.';
  RAISE NOTICE 'Recommended refresh interval: 5-15 minutes';
END $$;

