-- Fix Security Issues
-- This migration addresses Supabase database linter errors

-- 1. Fix active_users view: Explicitly set to SECURITY INVOKER
-- This ensures the view uses the permissions of the querying user, not the creator
CREATE OR REPLACE VIEW active_users 
WITH (security_invoker = true) AS
SELECT 
    id,
    email,
    name,
    role,
    assigned_college,
    assigned_course,
    status,
    created_at,
    updated_at
FROM users
WHERE deleted_at IS NULL 
  AND status != 'ARCHIVED';

-- 2. Enable Row Level Security (RLS) on user_audit_log table
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for user_audit_log table
-- Drop existing policies first to make this migration idempotent
DROP POLICY IF EXISTS "admin_read_all_audit_logs" ON user_audit_log;
DROP POLICY IF EXISTS "college_org_read_audit_logs" ON user_audit_log;
DROP POLICY IF EXISTS "course_org_read_audit_logs" ON user_audit_log;
DROP POLICY IF EXISTS "allow_system_insert_audit_logs" ON user_audit_log;
DROP POLICY IF EXISTS "users_read_own_audit_logs" ON user_audit_log;

-- Policy: Allow ADMIN to read all audit logs
CREATE POLICY "admin_read_all_audit_logs" ON user_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'ADMIN'
            AND users.status = 'ACTIVE'
        )
    );

-- Policy: Allow COLLEGE_ORG to read audit logs for users in their college
CREATE POLICY "college_org_read_audit_logs" ON user_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u1
            WHERE u1.id = auth.uid()
            AND u1.role = 'COLLEGE_ORG'
            AND u1.status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM users u2
                WHERE u2.id = user_audit_log.user_id
                AND u2.assigned_college = u1.assigned_college
            )
        )
    );

-- Policy: Allow COURSE_ORG to read audit logs for users in their course
CREATE POLICY "course_org_read_audit_logs" ON user_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u1
            WHERE u1.id = auth.uid()
            AND u1.role = 'COURSE_ORG'
            AND u1.status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM users u2
                WHERE u2.id = user_audit_log.user_id
                AND u2.assigned_college = u1.assigned_college
                AND (
                    u1.assigned_courses IS NULL 
                    OR u2.assigned_course = ANY(u1.assigned_courses)
                )
            )
        )
    );

-- Policy: Allow authenticated users to insert audit logs (for system operations)
-- This is needed because triggers and system operations need to write to the audit log
CREATE POLICY "allow_system_insert_audit_logs" ON user_audit_log
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow users to read their own audit logs
CREATE POLICY "users_read_own_audit_logs" ON user_audit_log
    FOR SELECT
    USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE user_audit_log IS 'Audit log for user management actions. RLS enabled with role-based access policies.';

-- 4. Fix Function Search Path Issues
-- All functions need explicit search_path to prevent search path injection attacks

-- Fix: cleanup_old_archived_users
CREATE OR REPLACE FUNCTION cleanup_old_archived_users()
RETURNS void
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Mark users as deleted who have been archived for 2+ years
    UPDATE users
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE archived_at IS NOT NULL
      AND archived_at < CURRENT_TIMESTAMP - INTERVAL '2 years'
      AND deleted_at IS NULL;
END;
$$;

-- Fix: delete_old_archived_students
CREATE OR REPLACE FUNCTION delete_old_archived_students()
RETURNS void
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete students archived more than 2 years ago
    -- CASCADE will handle related records (attendance, payments, etc.)
    DELETE FROM students
    WHERE archived = TRUE 
    AND archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '2 years';
END;
$$;

-- Fix: has_access_to_college
CREATE OR REPLACE FUNCTION has_access_to_college(
    user_id UUID,
    target_college VARCHAR
)
RETURNS BOOLEAN
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    user_role VARCHAR;
    user_college VARCHAR;
BEGIN
    SELECT role, assigned_college INTO user_role, user_college
    FROM users
    WHERE id = user_id AND status = 'ACTIVE';
    
    -- ADMIN has access to everything
    IF user_role = 'ADMIN' THEN
        RETURN TRUE;
    END IF;
    
    -- COLLEGE_ORG has access to their assigned college
    IF user_role = 'COLLEGE_ORG' AND user_college = target_college THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Fix: has_access_to_course
CREATE OR REPLACE FUNCTION has_access_to_course(
    user_id UUID,
    target_college VARCHAR,
    target_course VARCHAR
)
RETURNS BOOLEAN
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    user_role VARCHAR;
    user_college VARCHAR;
    user_course VARCHAR;
BEGIN
    SELECT role, assigned_college, assigned_course 
    INTO user_role, user_college, user_course
    FROM users
    WHERE id = user_id AND status = 'ACTIVE';
    
    -- ADMIN has access to everything
    IF user_role = 'ADMIN' THEN
        RETURN TRUE;
    END IF;
    
    -- COLLEGE_ORG has access to all courses in their college
    IF user_role = 'COLLEGE_ORG' AND user_college = target_college THEN
        RETURN TRUE;
    END IF;
    
    -- COURSE_ORG has access to their specific course
    IF user_role = 'COURSE_ORG' 
       AND user_college = target_college 
       AND user_course = target_course THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Fix: log_user_changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO user_audit_log (user_id, action, details)
        VALUES (
            NEW.id,
            'USER_UPDATED',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_role', OLD.role,
                'new_role', NEW.role,
                'old_college', OLD.assigned_college,
                'new_college', NEW.assigned_college,
                'old_course', OLD.assigned_course,
                'new_course', NEW.assigned_course
            )
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO user_audit_log (user_id, action, details)
        VALUES (
            NEW.id,
            'USER_CREATED',
            jsonb_build_object(
                'role', NEW.role,
                'status', NEW.status,
                'college', NEW.assigned_college,
                'course', NEW.assigned_course
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Fix: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

