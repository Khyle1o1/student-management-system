-- Intramurals Tournament Bracketing System Migration
-- This migration adds tournament bracketing features similar to Challonge.com

-- Add tournament fields to intramurals_events table
ALTER TABLE intramurals_events
ADD COLUMN IF NOT EXISTS is_tournament BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bracket_type VARCHAR(50) CHECK (bracket_type IN ('single_elimination', 'double_elimination', 'round_robin')),
ADD COLUMN IF NOT EXISTS randomize_teams BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS randomize_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS randomize_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_random_attempts INTEGER DEFAULT 5;

-- Create intramurals_tournament_teams table (links teams to tournaments with seeding)
CREATE TABLE IF NOT EXISTS intramurals_tournament_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES intramurals_events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES intramurals_teams(id) ON DELETE CASCADE,
    seed INTEGER, -- Position in bracket (1, 2, 3, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, team_id),
    UNIQUE(tournament_id, seed) -- Ensure unique seeds per tournament
);

-- Create intramurals_matches table
CREATE TABLE IF NOT EXISTS intramurals_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES intramurals_events(id) ON DELETE CASCADE,
    round INTEGER NOT NULL, -- Round number (1 = first round, 2 = second round, etc.)
    match_number INTEGER NOT NULL, -- Match number within the round
    team1_id UUID REFERENCES intramurals_teams(id) ON DELETE SET NULL,
    team2_id UUID REFERENCES intramurals_teams(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES intramurals_teams(id) ON DELETE SET NULL,
    team1_score INTEGER,
    team2_score INTEGER,
    is_bye BOOLEAN DEFAULT false, -- True if this match is a bye (only one team)
    next_match_id UUID REFERENCES intramurals_matches(id) ON DELETE SET NULL, -- Link to next match in bracket
    next_match_position INTEGER, -- Position in next match (1 or 2)
    loser_next_match_id UUID REFERENCES intramurals_matches(id) ON DELETE SET NULL, -- Link to next match for the loser (e.g., 3rd place)
    loser_next_match_position INTEGER, -- Position in loser match (1 or 2)
    is_third_place BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, round, match_number)
);

ALTER TABLE intramurals_matches
    ADD COLUMN IF NOT EXISTS loser_next_match_id UUID REFERENCES intramurals_matches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS loser_next_match_position INTEGER,
    ADD COLUMN IF NOT EXISTS is_third_place BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS bracket_stage VARCHAR(20),
    ADD COLUMN IF NOT EXISTS stage_round INTEGER,
    ADD COLUMN IF NOT EXISTS display_label TEXT,
    ADD COLUMN IF NOT EXISTS template_key TEXT;

ALTER TABLE intramurals_events
    ADD COLUMN IF NOT EXISTS bracket_template JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON intramurals_tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_team ON intramurals_tournament_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON intramurals_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON intramurals_matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON intramurals_matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_next_match ON intramurals_matches(next_match_id);
CREATE INDEX IF NOT EXISTS idx_matches_loser_next_match ON intramurals_matches(loser_next_match_id);
CREATE INDEX IF NOT EXISTS idx_matches_third_place ON intramurals_matches(is_third_place);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_intramurals_matches_updated_at'
    ) THEN
        CREATE TRIGGER update_intramurals_matches_updated_at
            BEFORE UPDATE ON intramurals_matches
            FOR EACH ROW
            EXECUTE FUNCTION update_matches_updated_at();
    END IF;
END $$;

-- Create function to automatically advance winners to next round
CREATE OR REPLACE FUNCTION advance_tournament_winner()
RETURNS TRIGGER AS $$
DECLARE
    next_match_record RECORD;
    next_position INTEGER;
    new_status VARCHAR(50);
BEGIN
    -- Only process if match is completed and has a winner
    IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL AND NEW.next_match_id IS NOT NULL THEN
        -- Get the next match
        SELECT * INTO next_match_record
        FROM intramurals_matches
        WHERE id = NEW.next_match_id;
        
        IF next_match_record IS NOT NULL THEN
            -- Determine which position in next match (team1 or team2)
            next_position := COALESCE(NEW.next_match_position, 1);
            
            -- Determine new status: if both teams are now set, mark as in_progress
            IF next_position = 1 THEN
                -- Winner goes to team1 position
                IF next_match_record.team2_id IS NOT NULL THEN
                    new_status := 'in_progress';
                ELSE
                    new_status := next_match_record.status;
                END IF;
                
                UPDATE intramurals_matches
                SET team1_id = NEW.winner_id,
                    status = new_status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.next_match_id;
            ELSE
                -- Winner goes to team2 position
                IF next_match_record.team1_id IS NOT NULL THEN
                    new_status := 'in_progress';
                ELSE
                    new_status := next_match_record.status;
                END IF;
                
                UPDATE intramurals_matches
                SET team2_id = NEW.winner_id,
                    status = new_status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.next_match_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically advance losers to third-place matches
CREATE OR REPLACE FUNCTION advance_tournament_loser()
RETURNS TRIGGER AS $$
DECLARE
    loser_id UUID;
    target_match RECORD;
    new_status VARCHAR(50);
BEGIN
    IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL AND NEW.loser_next_match_id IS NOT NULL THEN
        -- Determine loser
        IF NEW.team1_id IS NOT NULL AND NEW.team1_id != NEW.winner_id THEN
            loser_id := NEW.team1_id;
        ELSIF NEW.team2_id IS NOT NULL AND NEW.team2_id != NEW.winner_id THEN
            loser_id := NEW.team2_id;
        END IF;

        IF loser_id IS NULL THEN
            RETURN NEW;
        END IF;

        SELECT * INTO target_match
        FROM intramurals_matches
        WHERE id = NEW.loser_next_match_id;

        IF target_match IS NULL THEN
            RETURN NEW;
        END IF;

        -- Determine new status after placing loser
        IF NEW.loser_next_match_position = 1 THEN
            IF target_match.team2_id IS NOT NULL THEN
                new_status := 'in_progress';
            ELSE
                new_status := target_match.status;
            END IF;

            UPDATE intramurals_matches
            SET team1_id = loser_id,
                status = COALESCE(new_status, target_match.status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.loser_next_match_id;
        ELSE
            IF target_match.team1_id IS NOT NULL THEN
                new_status := 'in_progress';
            ELSE
                new_status := target_match.status;
            END IF;

            UPDATE intramurals_matches
            SET team2_id = loser_id,
                status = COALESCE(new_status, target_match.status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.loser_next_match_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically advance winners
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_advance_tournament_winner'
    ) THEN
        CREATE TRIGGER trigger_advance_tournament_winner
            AFTER UPDATE ON intramurals_matches
            FOR EACH ROW
            WHEN (NEW.status = 'completed' AND NEW.winner_id IS NOT NULL AND (OLD.status != 'completed' OR OLD.winner_id IS DISTINCT FROM NEW.winner_id))
            EXECUTE FUNCTION advance_tournament_winner();
    END IF;
END $$;

-- Create trigger to automatically advance losers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_advance_tournament_loser'
    ) THEN
        CREATE TRIGGER trigger_advance_tournament_loser
            AFTER UPDATE ON intramurals_matches
            FOR EACH ROW
            WHEN (NEW.status = 'completed' AND NEW.loser_next_match_id IS NOT NULL)
            EXECUTE FUNCTION advance_tournament_loser();
    END IF;
END $$;

-- Create function to automatically assign medals based on tournament results
CREATE OR REPLACE FUNCTION assign_tournament_medals()
RETURNS TRIGGER AS $$
DECLARE
    tournament_record RECORD;
    final_match RECORD;
    semi_final_match1 RECORD;
    semi_final_match2 RECORD;
    bronze_match RECORD;
    third_place_match RECORD;
    gold_team_id UUID;
    silver_team_id UUID;
    bronze_team_id UUID;
    max_round INTEGER;
    semi_final_count INTEGER;
BEGIN
    -- Only process if match is completed
    IF NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;
    
    -- Get tournament info
    SELECT * INTO tournament_record
    FROM intramurals_events
    WHERE id = NEW.tournament_id AND is_tournament = true;
    
    IF tournament_record IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Find the maximum round number
    SELECT MAX(round) INTO max_round
    FROM intramurals_matches
    WHERE tournament_id = NEW.tournament_id;
    
    -- Check if final match is completed
    SELECT * INTO final_match
    FROM intramurals_matches
    WHERE tournament_id = NEW.tournament_id
      AND round = max_round
      AND status = 'completed'
      AND winner_id IS NOT NULL
      AND (is_third_place IS NULL OR is_third_place = false);
    
    -- If final is completed, assign medals
    IF final_match IS NOT NULL THEN
        -- Gold = winner of final
        gold_team_id := final_match.winner_id;
        
        -- Silver = loser of final (the other team)
        IF final_match.team1_id = final_match.winner_id THEN
            silver_team_id := final_match.team2_id;
        ELSE
            silver_team_id := final_match.team1_id;
        END IF;
        
        -- Bronze depends on bracket type
        IF tournament_record.bracket_type = 'single_elimination' THEN
            -- Prefer third place match winner if available
            SELECT * INTO third_place_match
            FROM intramurals_matches
            WHERE tournament_id = NEW.tournament_id
              AND is_third_place = true
              AND status = 'completed'
              AND winner_id IS NOT NULL
            LIMIT 1;

            IF third_place_match IS NOT NULL THEN
                bronze_team_id := third_place_match.winner_id;
            ELSE
                -- Fallback to semi-final losers logic
                SELECT COUNT(*) INTO semi_final_count
                FROM intramurals_matches
                WHERE tournament_id = NEW.tournament_id
                  AND round = max_round - 1
                  AND status = 'completed';
                
                IF semi_final_count >= 2 THEN
                    -- Get first semi-final match
                    SELECT * INTO semi_final_match1
                    FROM intramurals_matches
                    WHERE tournament_id = NEW.tournament_id
                      AND round = max_round - 1
                      AND status = 'completed'
                    ORDER BY match_number
                    LIMIT 1;
                    
                    -- Get second semi-final match
                    SELECT * INTO semi_final_match2
                    FROM intramurals_matches
                    WHERE tournament_id = NEW.tournament_id
                      AND round = max_round - 1
                      AND status = 'completed'
                    ORDER BY match_number
                    OFFSET 1
                    LIMIT 1;
                    
                    -- Find the team that lost in semi-final but didn't make it to final
                    IF semi_final_match1.winner_id IS NOT NULL AND 
                       semi_final_match1.winner_id != final_match.team1_id AND 
                       semi_final_match1.winner_id != final_match.team2_id THEN
                        IF semi_final_match1.team1_id = semi_final_match1.winner_id THEN
                            bronze_team_id := semi_final_match1.team2_id;
                        ELSE
                            bronze_team_id := semi_final_match1.team1_id;
                        END IF;
                    ELSIF semi_final_match2.winner_id IS NOT NULL AND 
                          semi_final_match2.winner_id != final_match.team1_id AND 
                          semi_final_match2.winner_id != final_match.team2_id THEN
                        IF semi_final_match2.team1_id = semi_final_match2.winner_id THEN
                            bronze_team_id := semi_final_match2.team2_id;
                        ELSE
                            bronze_team_id := semi_final_match2.team1_id;
                        END IF;
                    END IF;
                END IF;
            END IF;
        ELSIF tournament_record.bracket_type = 'double_elimination' THEN
            -- For double elimination, bronze goes to 3rd place match winner
            -- Find 3rd place match (usually round before final or special round)
            SELECT * INTO bronze_match
            FROM intramurals_matches
            WHERE tournament_id = NEW.tournament_id
              AND round = max_round - 1
              AND status = 'completed'
              AND winner_id IS NOT NULL
              AND id != final_match.id
            LIMIT 1;
            
            IF bronze_match IS NOT NULL THEN
                bronze_team_id := bronze_match.winner_id;
            END IF;
        ELSIF tournament_record.bracket_type = 'round_robin' THEN
            -- For round robin, bronze is 3rd place by standings
            -- This would need custom logic based on win/loss records
            -- For now, we'll leave it null and handle in application logic
            bronze_team_id := NULL;
        END IF;
        
        -- Update or insert medal awards
        INSERT INTO intramurals_medal_awards (event_id, gold_team_id, silver_team_id, bronze_team_id)
        VALUES (NEW.tournament_id, gold_team_id, silver_team_id, bronze_team_id)
        ON CONFLICT (event_id)
        DO UPDATE SET
            gold_team_id = EXCLUDED.gold_team_id,
            silver_team_id = EXCLUDED.silver_team_id,
            bronze_team_id = EXCLUDED.bronze_team_id,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to assign medals when tournament completes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_assign_tournament_medals'
    ) THEN
        CREATE TRIGGER trigger_assign_tournament_medals
            AFTER UPDATE ON intramurals_matches
            FOR EACH ROW
            WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
            EXECUTE FUNCTION assign_tournament_medals();
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE intramurals_tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE intramurals_matches ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Public can view tournament teams'
          AND tablename = 'intramurals_tournament_teams'
    ) THEN
        CREATE POLICY "Public can view tournament teams" ON intramurals_tournament_teams
            FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Public can view matches'
          AND tablename = 'intramurals_matches'
    ) THEN
        CREATE POLICY "Public can view matches" ON intramurals_matches
            FOR SELECT USING (true);
    END IF;
END $$;

-- Note: Admin policies should be handled through your application's authentication system
-- Admin operations will use the service role key which bypasses RLS

