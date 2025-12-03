-- Migration: Add org_access_level to users (for College Organization sub-roles)
-- This column stores the access level for COLLEGE_ORG accounts only:
--   'finance' | 'event' | 'college'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'org_access_level'
  ) THEN
    ALTER TABLE users 
      ADD COLUMN org_access_level VARCHAR(20);

    COMMENT ON COLUMN users.org_access_level IS 
      'Sub-role for COLLEGE_ORG accounts: finance, event, or college (full)';
  END IF;
END $$;


