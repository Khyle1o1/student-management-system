-- Organization Feedback Module Migration
-- Adds public feedback capture for student organizations with analytics-friendly indexes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_feedback'
  ) THEN
    CREATE TABLE organization_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255),
      student_id VARCHAR(100),
      email VARCHAR(255),
      year_course VARCHAR(255),
      user_type VARCHAR(50),
      purpose VARCHAR(50),
      accessibility INT CHECK (accessibility BETWEEN 1 AND 5),
      responsiveness INT CHECK (responsiveness BETWEEN 1 AND 5),
      transparency INT CHECK (transparency BETWEEN 1 AND 5),
      professionalism INT CHECK (professionalism BETWEEN 1 AND 5),
      helpfulness INT CHECK (helpfulness BETWEEN 1 AND 5),
      communication INT CHECK (communication BETWEEN 1 AND 5),
      event_quality INT CHECK (event_quality BETWEEN 1 AND 5),
      overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
      reaction_type VARCHAR(30),
      comment TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'NEW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;

  -- Backfill NOT NULL defaults if table already existed without them
  ALTER TABLE organization_feedback
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();

  -- Ensure status has a sensible default
  UPDATE organization_feedback SET status = COALESCE(status, 'NEW') WHERE status IS NULL;
END $$;

-- Helpful indexes for filtering and analytics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_feedback_org_id') THEN
    CREATE INDEX idx_org_feedback_org_id ON organization_feedback(org_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_feedback_created_at') THEN
    CREATE INDEX idx_org_feedback_created_at ON organization_feedback(created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_feedback_status') THEN
    CREATE INDEX idx_org_feedback_status ON organization_feedback(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_feedback_reaction') THEN
    CREATE INDEX idx_org_feedback_reaction ON organization_feedback(reaction_type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_feedback_purpose') THEN
    CREATE INDEX idx_org_feedback_purpose ON organization_feedback(purpose);
  END IF;
END $$;

-- Comment metadata
COMMENT ON TABLE organization_feedback IS 'Public feedback directed to specific organizations (admin/org visibility only)';
COMMENT ON COLUMN organization_feedback.org_id IS 'Organization user id receiving the feedback';
COMMENT ON COLUMN organization_feedback.reaction_type IS 'positive, negative, suggestion, complaint, other';
COMMENT ON COLUMN organization_feedback.status IS 'NEW | ACKNOWLEDGED | RESOLVED';





