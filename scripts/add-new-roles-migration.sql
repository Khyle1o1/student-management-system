-- Migration: Add EVENTS_STAFF and INTRAMURALS_STAFF roles
-- This script adds the new role types to the users table for role-based access control

-- Note: This assumes you're using Supabase or PostgreSQL
-- Run this migration in your database console or via psql

-- Step 1: Check if the roles already exist in the users table
-- If the role column has a CHECK constraint or ENUM type, we need to update it

-- For text-based role columns, no schema change needed
-- For ENUM-based role columns, update the enum:

-- If using PostgreSQL ENUM (uncomment if your database uses ENUMs):
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'EVENTS_STAFF';
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'INTRAMURALS_STAFF';

-- Step 2: Verify the roles can be inserted
-- Test inserting a sample user with EVENTS_STAFF role (optional, for verification)
-- Uncomment below to test:
/*
INSERT INTO users (email, name, role, status, password, created_at, updated_at)
VALUES (
  'events.staff@example.com',
  'Events Staff Test',
  'EVENTS_STAFF',
  'ACTIVE',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5K5LOBfXXAqAW', -- hashed 'password123'
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, name, role, status, password, created_at, updated_at)
VALUES (
  'intramurals.staff@example.com',
  'Intramurals Staff Test',
  'INTRAMURALS_STAFF',
  'ACTIVE',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5K5LOBfXXAqAW', -- hashed 'password123'
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
*/

-- Step 3: Update any existing role checks or constraints
-- IMPORTANT: This is required to allow the new roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('ADMIN', 'EVENTS_STAFF', 'INTRAMURALS_STAFF', 'COLLEGE_ORG', 'COURSE_ORG', 'USER'));

-- Step 4: Update Row Level Security (RLS) policies if applicable
-- Review and update any RLS policies that filter by role to include the new roles

COMMENT ON COLUMN users.role IS 'User role: ADMIN, EVENTS_STAFF, INTRAMURALS_STAFF, COLLEGE_ORG, COURSE_ORG, or USER';

-- Migration complete
-- New roles available: EVENTS_STAFF, INTRAMURALS_STAFF
