-- Migration: Make organization feedback independent of users table
-- Adds org_name for text-only targeting and relaxes org_id requirements

DO $$
BEGIN
  -- Drop FK to users if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'organization_feedback_org_id_fkey'
      AND table_name = 'organization_feedback'
  ) THEN
    ALTER TABLE organization_feedback DROP CONSTRAINT organization_feedback_org_id_fkey;
  END IF;

  -- Allow org_id to be nullable
  ALTER TABLE organization_feedback ALTER COLUMN org_id DROP NOT NULL;

  -- Add org_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_feedback' AND column_name = 'org_name'
  ) THEN
    ALTER TABLE organization_feedback ADD COLUMN org_name TEXT;
  END IF;
END $$;


