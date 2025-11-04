-- User Management System Migration
-- This migration adds support for hierarchical role-based access control

-- Step 1: Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assigned_college VARCHAR(100),
ADD COLUMN IF NOT EXISTS assigned_course VARCHAR(100),
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Update role column to support new role types
-- ADMIN = System Administrator (Supreme Student Council)
-- COLLEGE_ORG = College Organization
-- COURSE_ORG = Course Organization
-- Note: Regular students use the 'students' table, not 'users' table

-- Remove the USER role - it's not needed in the users table
-- The users table is ONLY for administrative access control
-- Students authenticate through the students table

-- Drop existing constraint if it exists (to avoid conflicts)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
END $$;

-- Add check constraint for valid roles (ONLY admin roles, no USER)
-- Add constraint as NOT VALID to avoid failing on legacy rows; new writes are still enforced
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG')) NOT VALID;

-- Optional (run after cleaning legacy data):
-- ALTER TABLE users VALIDATE CONSTRAINT users_role_check;

-- Add check constraint for valid statuses
-- Drop existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_status_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_status_check;
    END IF;
END $$;

ALTER TABLE users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('ACTIVE', 'ARCHIVED', 'SUSPENDED'));

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_assigned_college ON users(assigned_college);
CREATE INDEX IF NOT EXISTS idx_users_assigned_course ON users(assigned_course);
CREATE INDEX IF NOT EXISTS idx_users_archived_at ON users(archived_at);

-- Step 4: Create a view for active users (non-archived, non-deleted)
CREATE OR REPLACE VIEW active_users AS
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

-- Step 5: Create a function to automatically archive old archived users (2 years)
CREATE OR REPLACE FUNCTION cleanup_old_archived_users()
RETURNS void AS $$
BEGIN
    -- Mark users as deleted who have been archived for 2+ years
    UPDATE users
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE archived_at IS NOT NULL
      AND archived_at < CURRENT_TIMESTAMP - INTERVAL '2 years'
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a function to check user permissions
CREATE OR REPLACE FUNCTION has_access_to_college(
    user_id UUID,
    target_college VARCHAR
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- Step 7: Create a function to check course access
CREATE OR REPLACE FUNCTION has_access_to_course(
    user_id UUID,
    target_college VARCHAR,
    target_course VARCHAR
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- Step 8: Create audit log table for user management actions
CREATE TABLE IF NOT EXISTS user_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_performed_by ON user_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at);

-- Step 9: Create trigger to log user changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS user_changes_trigger ON users;
CREATE TRIGGER user_changes_trigger
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_changes();

-- Step 10: Update updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Add comments for documentation
COMMENT ON COLUMN users.role IS 'User role: ADMIN (Supreme Student Council), COLLEGE_ORG (College Organization), COURSE_ORG (Course Organization). Note: Students are in the students table, not here.';
COMMENT ON COLUMN users.status IS 'User status: ACTIVE, ARCHIVED, SUSPENDED';
COMMENT ON COLUMN users.assigned_college IS 'Assigned college for COLLEGE_ORG and COURSE_ORG roles';
COMMENT ON COLUMN users.assigned_course IS 'Assigned course for COURSE_ORG role';
COMMENT ON COLUMN users.archived_at IS 'Timestamp when user was archived';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was permanently deleted (soft delete)';

-- Step 12: Add assigned_courses array to support up to two courses for COURSE_ORG
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'assigned_courses'
  ) THEN
    ALTER TABLE users ADD COLUMN assigned_courses TEXT[];

    -- Backfill from legacy single assigned_course where present
    UPDATE users
    SET assigned_courses = CASE 
      WHEN assigned_course IS NOT NULL AND assigned_course <> '' THEN ARRAY[assigned_course]
      ELSE NULL
    END
    WHERE role = 'COURSE_ORG';

    -- Index for fast lookups
    CREATE INDEX IF NOT EXISTS idx_users_assigned_courses ON users USING GIN (assigned_courses);
  END IF;
END $$;
