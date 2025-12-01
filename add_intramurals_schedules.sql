-- Intramurals Match & Event Schedule Extension
-- This migration adds scheduling fields for intramurals events and a matches table

-- Extend intramurals_events with basic schedule + location (for non-match events)
ALTER TABLE intramurals_events
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create intramurals_matches table for match-based schedules
CREATE TABLE IF NOT EXISTS intramurals_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team1_id UUID NOT NULL REFERENCES intramurals_teams(id) ON DELETE CASCADE,
    team2_id UUID NOT NULL REFERENCES intramurals_teams(id) ON DELETE CASCADE,
    match_time TIMESTAMP WITH TIME ZONE,
    location TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    winner_id UUID REFERENCES intramurals_teams(id) ON DELETE SET NULL,
    team1_score INTEGER,
    team2_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure required columns exist even if table was previously created
ALTER TABLE intramurals_matches
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES intramurals_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS match_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Indexes for faster querying of upcoming matches
CREATE INDEX IF NOT EXISTS idx_intramurals_matches_event_time
    ON intramurals_matches(event_id, match_time);

CREATE INDEX IF NOT EXISTS idx_intramurals_matches_status_time
    ON intramurals_matches(status, match_time);

-- Enable RLS
ALTER TABLE intramurals_matches ENABLE ROW LEVEL SECURITY;

-- Public can view matches (for public schedule display) - idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'intramurals_matches'
      AND policyname = 'Public can view intramurals matches'
  ) THEN
    CREATE POLICY "Public can view intramurals matches" ON intramurals_matches
      FOR SELECT USING (true);
  END IF;
END $$;

-- Reuse generic updated_at trigger if it exists (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_intramurals_matches_updated_at'
  ) THEN
    CREATE TRIGGER update_intramurals_matches_updated_at
      BEFORE UPDATE ON intramurals_matches
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


