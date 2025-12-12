-- ========================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS (FIXED)
-- ========================================
-- Stored procedures to move heavy processing to the database
-- NOTE: This version doesn't assume deleted_at columns exist

-- ========================================
-- 1. ASSIGN FEE TO STUDENTS (Replaces slow JS loop)
-- ========================================

CREATE OR REPLACE FUNCTION assign_fee_to_students(
  p_fee_id UUID,
  p_amount DECIMAL(10,2),
  p_scope_type VARCHAR,
  p_scope_college VARCHAR DEFAULT NULL,
  p_scope_course VARCHAR DEFAULT NULL,
  p_exempted_student_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  total_assigned INTEGER,
  execution_time_ms NUMERIC
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  assigned_count INTEGER;
BEGIN
  start_time := clock_timestamp();

  -- Insert payments for all eligible students in a single query
  INSERT INTO payments (student_id, fee_id, amount, status, payment_date)
  SELECT 
    s.id,
    p_fee_id,
    p_amount,
    'UNPAID',
    NULL
  FROM students s
  WHERE (s.archived IS NULL OR s.archived = false)
    AND s.id != ALL(p_exempted_student_ids)
    AND (
      (p_scope_type = 'UNIVERSITY_WIDE')
      OR (p_scope_type = 'COLLEGE_WIDE' AND s.college = p_scope_college)
      OR (p_scope_type = 'COURSE_SPECIFIC' AND s.course = p_scope_course)
    )
    -- Avoid duplicates
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.student_id = s.id
        AND p.fee_id = p_fee_id
    );

  GET DIAGNOSTICS assigned_count = ROW_COUNT;
  end_time := clock_timestamp();

  RETURN QUERY SELECT 
    assigned_count,
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_fee_to_students IS 
  'Assigns a fee to all eligible students based on scope. Much faster than looping in application code.';

-- ========================================
-- 2. GET FEEDBACK STATISTICS (Replaces slow JS aggregation)
-- ========================================

CREATE OR REPLACE FUNCTION get_feedback_stats(
  p_org_name TEXT DEFAULT NULL,
  p_purpose VARCHAR DEFAULT NULL,
  p_user_type VARCHAR DEFAULT NULL,
  p_reaction_type VARCHAR DEFAULT NULL,
  p_status VARCHAR DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL,
  p_min_rating INTEGER DEFAULT NULL,
  p_max_rating INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Get aggregated statistics in a single query
  WITH filtered_feedback AS (
    SELECT *
    FROM organization_feedback
    WHERE (p_org_name IS NULL OR org_name = p_org_name)
      AND (p_purpose IS NULL OR purpose = p_purpose)
      AND (p_user_type IS NULL OR user_type = p_user_type)
      AND (p_reaction_type IS NULL OR reaction_type = p_reaction_type)
      AND (p_status IS NULL OR status = p_status)
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
      AND (p_min_rating IS NULL OR overall_rating >= p_min_rating)
      AND (p_max_rating IS NULL OR overall_rating <= p_max_rating)
  ),
  aggregated_stats AS (
    SELECT
      COUNT(*) as total,
      ROUND(AVG(overall_rating)::numeric, 2) as average_overall,
      ROUND(AVG(accessibility)::numeric, 2) as avg_accessibility,
      ROUND(AVG(responsiveness)::numeric, 2) as avg_responsiveness,
      ROUND(AVG(transparency)::numeric, 2) as avg_transparency,
      ROUND(AVG(professionalism)::numeric, 2) as avg_professionalism,
      ROUND(AVG(helpfulness)::numeric, 2) as avg_helpfulness,
      ROUND(AVG(communication)::numeric, 2) as avg_communication,
      ROUND(AVG(event_quality)::numeric, 2) as avg_event_quality
    FROM filtered_feedback
  ),
  reaction_breakdown AS (
    SELECT 
      COALESCE(reaction_type, 'other') as reaction_type,
      COUNT(*) as count
    FROM filtered_feedback
    GROUP BY reaction_type
  ),
  status_breakdown AS (
    SELECT 
      status,
      COUNT(*) as count
    FROM filtered_feedback
    GROUP BY status
  ),
  daily_trend AS (
    SELECT 
      DATE(created_at) as day,
      COUNT(*) as count
    FROM filtered_feedback
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 30
  ),
  org_summary AS (
    SELECT 
      org_name,
      COUNT(*) as total,
      ROUND(AVG(overall_rating)::numeric, 2) as average_overall
    FROM filtered_feedback
    GROUP BY org_name
  )
  SELECT json_build_object(
    'total', COALESCE((SELECT total FROM aggregated_stats), 0),
    'averageOverall', COALESCE((SELECT average_overall FROM aggregated_stats), 0),
    'categoryAverages', json_build_object(
      'accessibility', COALESCE((SELECT avg_accessibility FROM aggregated_stats), 0),
      'responsiveness', COALESCE((SELECT avg_responsiveness FROM aggregated_stats), 0),
      'transparency', COALESCE((SELECT avg_transparency FROM aggregated_stats), 0),
      'professionalism', COALESCE((SELECT avg_professionalism FROM aggregated_stats), 0),
      'helpfulness', COALESCE((SELECT avg_helpfulness FROM aggregated_stats), 0),
      'communication', COALESCE((SELECT avg_communication FROM aggregated_stats), 0),
      'event_quality', COALESCE((SELECT avg_event_quality FROM aggregated_stats), 0),
      'overall_rating', COALESCE((SELECT average_overall FROM aggregated_stats), 0)
    ),
    'reactionBreakdown', COALESCE(
      (SELECT json_object_agg(reaction_type, count) FROM reaction_breakdown),
      '{}'::json
    ),
    'statusBreakdown', COALESCE(
      (SELECT json_object_agg(status, count) FROM status_breakdown),
      '{}'::json
    ),
    'dailyTrend', COALESCE(
      (SELECT json_object_agg(day, count) FROM daily_trend),
      '{}'::json
    ),
    'orgSummaries', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'org_name', org_name,
          'total', total,
          'average_overall', average_overall
        )
      ) FROM org_summary),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_feedback_stats IS 
  'Returns comprehensive feedback statistics as JSON. Replaces loading 2000+ rows in JavaScript.';

-- ========================================
-- 3. GET EVENT ATTENDANCE STATS (Batch query optimization)
-- ========================================

CREATE OR REPLACE FUNCTION get_events_with_attendance_stats(
  p_event_ids UUID[],
  p_include_evaluations BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  event_id UUID,
  total_present INTEGER,
  total_eligible INTEGER,
  attendance_rate NUMERIC,
  evaluation_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
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
    WHERE e.id = ANY(p_event_ids)
      AND (s.archived IS NULL OR s.archived = false)
    GROUP BY e.id
  ),
  attendance_stats AS (
    SELECT 
      a.event_id,
      COUNT(DISTINCT a.student_id) as present_count
    FROM attendance a
    INNER JOIN events e ON a.event_id = e.id
    WHERE a.event_id = ANY(p_event_ids)
      AND a.time_in IS NOT NULL
      AND (
        COALESCE(e.attendance_type, 'IN_ONLY') = 'IN_ONLY' 
        OR (e.attendance_type = 'IN_OUT' AND a.time_out IS NOT NULL)
      )
    GROUP BY a.event_id
  ),
  evaluation_stats AS (
    SELECT 
      event_id,
      COUNT(*) as eval_count
    FROM form_responses
    WHERE event_id = ANY(p_event_ids)
    GROUP BY event_id
  )
  SELECT 
    COALESCE(es.event_id, ast.event_id) as event_id,
    COALESCE(ast.present_count, 0)::INTEGER as total_present,
    COALESCE(es.eligible_count, 0)::INTEGER as total_eligible,
    CASE 
      WHEN COALESCE(es.eligible_count, 0) > 0 THEN
        ROUND((COALESCE(ast.present_count, 0)::NUMERIC / es.eligible_count::NUMERIC * 100), 2)
      ELSE 0
    END as attendance_rate,
    CASE 
      WHEN p_include_evaluations THEN COALESCE(evs.eval_count, 0)::INTEGER
      ELSE 0
    END as evaluation_count
  FROM eligible_students es
  FULL OUTER JOIN attendance_stats ast ON es.event_id = ast.event_id
  LEFT JOIN evaluation_stats evs ON COALESCE(es.event_id, ast.event_id) = evs.event_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_events_with_attendance_stats IS 
  'Returns attendance statistics for multiple events in a single query. Eliminates N+1 problem.';

-- ========================================
-- 4. GET DASHBOARD STATS (Parallelized)
-- ========================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_user_role VARCHAR,
  p_user_college VARCHAR DEFAULT NULL,
  p_user_course VARCHAR DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH 
  student_stats AS (
    SELECT 
      COUNT(*) FILTER (
        WHERE (p_user_role = 'ADMIN')
        OR (p_user_role = 'COLLEGE_ORG' AND college = p_user_college)
        OR (p_user_role = 'COURSE_ORG' AND course = p_user_course)
      ) as total_students,
      COUNT(*) FILTER (
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND (
          (p_user_role = 'ADMIN')
          OR (p_user_role = 'COLLEGE_ORG' AND college = p_user_college)
          OR (p_user_role = 'COURSE_ORG' AND course = p_user_course)
        )
      ) as new_students_30d
    FROM students
    WHERE (archived IS NULL OR archived = false)
  ),
  event_stats AS (
    SELECT 
      COUNT(*) FILTER (
        WHERE date >= CURRENT_DATE
        AND (
          (p_user_role = 'ADMIN')
          OR (p_user_role = 'COLLEGE_ORG' AND scope_college = p_user_college)
          OR (p_user_role = 'COURSE_ORG' AND scope_course = p_user_course)
        )
      ) as upcoming_events,
      COUNT(*) FILTER (
        WHERE status = 'PENDING'
      ) as pending_events
    FROM events
  ),
  payment_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'UNPAID') as unpaid_count,
      COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
      SUM(amount) FILTER (WHERE status = 'PAID') as total_revenue,
      SUM(amount) FILTER (
        WHERE status = 'PAID' 
        AND payment_date >= CURRENT_DATE - INTERVAL '30 days'
      ) as revenue_30d
    FROM payments
  )
  SELECT json_build_object(
    'students', json_build_object(
      'total', COALESCE((SELECT total_students FROM student_stats), 0),
      'new', COALESCE((SELECT new_students_30d FROM student_stats), 0)
    ),
    'events', json_build_object(
      'upcoming', COALESCE((SELECT upcoming_events FROM event_stats), 0),
      'pending', COALESCE((SELECT pending_events FROM event_stats), 0)
    ),
    'payments', json_build_object(
      'unpaid', COALESCE((SELECT unpaid_count FROM payment_stats), 0),
      'pending', COALESCE((SELECT pending_count FROM payment_stats), 0),
      'revenue', json_build_object(
        'total', COALESCE((SELECT total_revenue FROM payment_stats), 0),
        'monthly', COALESCE((SELECT revenue_30d FROM payment_stats), 0)
      )
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_stats IS 
  'Returns all dashboard statistics in a single query with role-based filtering.';

-- ========================================
-- 5. BATCH DELETE ARCHIVED RECORDS
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_old_archived_records(
  p_archive_age_days INTEGER DEFAULT 730, -- 2 years default
  p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (
  table_name TEXT,
  records_deleted INTEGER,
  execution_time_ms NUMERIC
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  deleted_count INTEGER;
BEGIN
  -- Clean up archived students
  start_time := clock_timestamp();
  
  DELETE FROM students
  WHERE id IN (
    SELECT id FROM students
    WHERE archived = true
      AND archived_at < CURRENT_TIMESTAMP - (p_archive_age_days || ' days')::INTERVAL
    LIMIT p_batch_size
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'students'::TEXT,
    deleted_count,
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  -- Clean up archived users
  start_time := clock_timestamp();
  
  DELETE FROM users
  WHERE id IN (
    SELECT id FROM users
    WHERE archived_at IS NOT NULL
      AND archived_at < CURRENT_TIMESTAMP - (p_archive_age_days || ' days')::INTERVAL
    LIMIT p_batch_size
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'users'::TEXT,
    deleted_count,
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  -- Clean up old notifications (90 days)
  start_time := clock_timestamp();
  
  DELETE FROM notifications
  WHERE id IN (
    SELECT id FROM notifications
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
    LIMIT p_batch_size
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'notifications'::TEXT,
    deleted_count,
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_archived_records IS 
  'Batch deletes old archived records to free up database space.';

-- ========================================
-- 6. ANALYZE TABLE PERFORMANCE
-- ========================================

CREATE OR REPLACE FUNCTION analyze_table_performance()
RETURNS TABLE (
  table_name TEXT,
  total_size TEXT,
  table_size TEXT,
  indexes_size TEXT,
  row_count BIGINT,
  dead_rows BIGINT,
  bloat_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))::TEXT as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename))::TEXT as table_size,
    pg_size_pretty(
      pg_total_relation_size(schemaname||'.'||tablename) - 
      pg_relation_size(schemaname||'.'||tablename)
    )::TEXT as indexes_size,
    s.n_live_tup as row_count,
    s.n_dead_tup as dead_rows,
    CASE 
      WHEN s.n_live_tup > 0 THEN
        ROUND((s.n_dead_tup::NUMERIC / s.n_live_tup::NUMERIC * 100), 2)
      ELSE 0
    END as bloat_ratio
  FROM pg_tables t
  LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_table_performance IS 
  'Returns table size and bloat statistics for all tables.';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Performance optimization functions created!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  1. assign_fee_to_students()';
  RAISE NOTICE '  2. get_feedback_stats()';
  RAISE NOTICE '  3. get_events_with_attendance_stats()';
  RAISE NOTICE '  4. get_dashboard_stats()';
  RAISE NOTICE '  5. cleanup_old_archived_records()';
  RAISE NOTICE '  6. analyze_table_performance()';
  RAISE NOTICE '';
  RAISE NOTICE 'Update your API endpoints to use these functions.';
  RAISE NOTICE '================================================';
END $$;

