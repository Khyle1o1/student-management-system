-- Intramurals Medal Management System Migration
-- This migration creates tables for managing intramurals standings based on medal counts

-- Create intramurals_teams table
CREATE TABLE IF NOT EXISTS intramurals_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    logo TEXT,
    color VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create intramurals_events table
CREATE TABLE IF NOT EXISTS intramurals_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('sports', 'socio-cultural')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create intramurals_medal_awards table
CREATE TABLE IF NOT EXISTS intramurals_medal_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES intramurals_events(id) ON DELETE CASCADE,
    gold_team_id UUID REFERENCES intramurals_teams(id) ON DELETE SET NULL,
    silver_team_id UUID REFERENCES intramurals_teams(id) ON DELETE SET NULL,
    bronze_team_id UUID REFERENCES intramurals_teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id) -- One medal assignment per event
);

-- Create intramurals_settings table
CREATE TABLE IF NOT EXISTS intramurals_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_visible BOOLEAN NOT NULL DEFAULT false,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings row
INSERT INTO intramurals_settings (is_visible, last_updated)
VALUES (false, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_intramurals_events_category ON intramurals_events(category);
CREATE INDEX IF NOT EXISTS idx_intramurals_medal_awards_event_id ON intramurals_medal_awards(event_id);
CREATE INDEX IF NOT EXISTS idx_intramurals_medal_awards_gold_team ON intramurals_medal_awards(gold_team_id);
CREATE INDEX IF NOT EXISTS idx_intramurals_medal_awards_silver_team ON intramurals_medal_awards(silver_team_id);
CREATE INDEX IF NOT EXISTS idx_intramurals_medal_awards_bronze_team ON intramurals_medal_awards(bronze_team_id);

-- Create function to update last_updated timestamp in settings when medals change
CREATE OR REPLACE FUNCTION update_intramurals_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE intramurals_settings
    SET last_updated = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = (SELECT id FROM intramurals_settings LIMIT 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_updated when medal awards change
CREATE TRIGGER trigger_update_intramurals_last_updated
    AFTER INSERT OR UPDATE OR DELETE ON intramurals_medal_awards
    FOR EACH ROW
    EXECUTE FUNCTION update_intramurals_last_updated();

-- Create trigger to update last_updated when teams change
CREATE TRIGGER trigger_update_intramurals_last_updated_teams
    AFTER INSERT OR UPDATE OR DELETE ON intramurals_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_intramurals_last_updated();

-- Create trigger to update last_updated when events change
CREATE TRIGGER trigger_update_intramurals_last_updated_events
    AFTER INSERT OR UPDATE OR DELETE ON intramurals_events
    FOR EACH ROW
    EXECUTE FUNCTION update_intramurals_last_updated();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_intramurals_teams_updated_at
    BEFORE UPDATE ON intramurals_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intramurals_events_updated_at
    BEFORE UPDATE ON intramurals_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intramurals_medal_awards_updated_at
    BEFORE UPDATE ON intramurals_medal_awards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intramurals_settings_updated_at
    BEFORE UPDATE ON intramurals_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE intramurals_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE intramurals_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE intramurals_medal_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE intramurals_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (standings display)
CREATE POLICY "Public can view teams" ON intramurals_teams
    FOR SELECT USING (true);

CREATE POLICY "Public can view events" ON intramurals_events
    FOR SELECT USING (true);

CREATE POLICY "Public can view medal awards" ON intramurals_medal_awards
    FOR SELECT USING (true);

CREATE POLICY "Public can view settings" ON intramurals_settings
    FOR SELECT USING (true);

-- Note: Admin policies should be handled through your application's authentication system
-- Admin operations will use the service role key which bypasses RLS

