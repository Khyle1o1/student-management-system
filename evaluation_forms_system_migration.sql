-- Enhanced Evaluation Forms System Migration
-- Creates a comprehensive Google Forms-like system with advanced features

DO $$ 
BEGIN
    -- Drop existing tables if they exist (for clean migration)
    -- Comment this out if you want to preserve existing data
    
    -- Create evaluation_forms table (standalone forms not tied to events)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluation_forms') THEN
        CREATE TABLE evaluation_forms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            sections JSONB DEFAULT '[]', -- Array of section objects with title and description
            questions JSONB NOT NULL DEFAULT '[]', -- Array of question objects
            settings JSONB DEFAULT '{}', -- Form settings (deadline, allow multiple submissions, etc.)
            status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, CLOSED
            created_by UUID REFERENCES users(id),
            published_at TIMESTAMP WITH TIME ZONE,
            closes_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- Create form_responses table for user submissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_responses') THEN
        CREATE TABLE form_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id UUID REFERENCES evaluation_forms(id) ON DELETE CASCADE,
            respondent_id UUID REFERENCES users(id), -- Can be NULL for anonymous responses
            respondent_email VARCHAR(255),
            respondent_name VARCHAR(255),
            answers JSONB NOT NULL DEFAULT '{}', -- Object with question_id as key
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ip_address INET,
            user_agent TEXT
        );
    END IF;

    -- Create form_analytics table for caching statistics
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_analytics') THEN
        CREATE TABLE form_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id UUID REFERENCES evaluation_forms(id) ON DELETE CASCADE UNIQUE,
            total_responses INTEGER DEFAULT 0,
            completion_rate DECIMAL(5,2) DEFAULT 0,
            average_time_seconds INTEGER DEFAULT 0,
            question_statistics JSONB DEFAULT '{}', -- Pre-calculated stats per question
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- Create form_sections table for organizing questions into sections
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_sections') THEN
        CREATE TABLE form_sections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id UUID REFERENCES evaluation_forms(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            position INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- Add columns to existing evaluations table if needed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluations') THEN
        -- Add new columns to existing evaluations table for backward compatibility
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'status') THEN
            ALTER TABLE evaluations ADD COLUMN status VARCHAR(50) DEFAULT 'PUBLISHED';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'settings') THEN
            ALTER TABLE evaluations ADD COLUMN settings JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'published_at') THEN
            ALTER TABLE evaluations ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'closes_at') THEN
            ALTER TABLE evaluations ADD COLUMN closes_at TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;

END $$;

-- Create indexes for better performance
DO $$
BEGIN
    -- Evaluation forms indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_evaluation_forms_created_by') THEN
        CREATE INDEX idx_evaluation_forms_created_by ON evaluation_forms(created_by);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_evaluation_forms_status') THEN
        CREATE INDEX idx_evaluation_forms_status ON evaluation_forms(status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_evaluation_forms_published_at') THEN
        CREATE INDEX idx_evaluation_forms_published_at ON evaluation_forms(published_at);
    END IF;

    -- Form responses indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_form_responses_form_id') THEN
        CREATE INDEX idx_form_responses_form_id ON form_responses(form_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_form_responses_respondent_id') THEN
        CREATE INDEX idx_form_responses_respondent_id ON form_responses(respondent_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_form_responses_submitted_at') THEN
        CREATE INDEX idx_form_responses_submitted_at ON form_responses(submitted_at);
    END IF;

    -- Form analytics indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_form_analytics_form_id') THEN
        CREATE INDEX idx_form_analytics_form_id ON form_analytics(form_id);
    END IF;

    -- Form sections indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_form_sections_form_id') THEN
        CREATE INDEX idx_form_sections_form_id ON form_sections(form_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_form_sections_position') THEN
        CREATE INDEX idx_form_sections_position ON form_sections(position);
    END IF;
END $$;

-- Create function to update form analytics
CREATE OR REPLACE FUNCTION update_form_analytics(form_uuid UUID)
RETURNS void AS $$
DECLARE
    response_count INTEGER;
    question_stats JSONB;
BEGIN
    -- Count total responses
    SELECT COUNT(*) INTO response_count
    FROM form_responses
    WHERE form_id = form_uuid;

    -- Calculate question statistics (simplified version)
    SELECT jsonb_object_agg(
        question_id,
        jsonb_build_object(
            'response_count', COUNT(*),
            'last_updated', NOW()
        )
    ) INTO question_stats
    FROM (
        SELECT jsonb_object_keys(answers) as question_id
        FROM form_responses
        WHERE form_id = form_uuid
    ) sub
    GROUP BY question_id;

    -- Upsert analytics record
    INSERT INTO form_analytics (form_id, total_responses, question_statistics, last_updated)
    VALUES (form_uuid, response_count, COALESCE(question_stats, '{}'::jsonb), NOW())
    ON CONFLICT (form_id) 
    DO UPDATE SET
        total_responses = response_count,
        question_statistics = COALESCE(question_stats, '{}'::jsonb),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update analytics on new response
CREATE OR REPLACE FUNCTION trigger_update_form_analytics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_form_analytics(NEW.form_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_update_form_analytics') THEN
        CREATE TRIGGER tr_update_form_analytics
        AFTER INSERT ON form_responses
        FOR EACH ROW
        EXECUTE FUNCTION trigger_update_form_analytics();
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE evaluation_forms IS 'Standalone evaluation forms similar to Google Forms';
COMMENT ON TABLE form_responses IS 'User responses to evaluation forms';
COMMENT ON TABLE form_analytics IS 'Cached analytics and statistics for forms';
COMMENT ON TABLE form_sections IS 'Sections to organize form questions';

COMMENT ON COLUMN evaluation_forms.sections IS 'JSONB array of section objects with id, title, description, and order';
COMMENT ON COLUMN evaluation_forms.questions IS 'JSONB array of question objects with type, text, options, required, sectionId, etc.';
COMMENT ON COLUMN evaluation_forms.settings IS 'JSONB object for form settings like deadline, allow_multiple_submissions, require_login, etc.';
COMMENT ON COLUMN evaluation_forms.status IS 'Form status: DRAFT, PUBLISHED, or CLOSED';
COMMENT ON COLUMN form_responses.answers IS 'JSONB object with question IDs as keys and user answers as values';
COMMENT ON COLUMN form_analytics.question_statistics IS 'Pre-calculated statistics per question for faster dashboard loading';

-- Insert sample evaluation form
INSERT INTO evaluation_forms (title, description, questions, status, settings)
VALUES (
    'Sample Event Feedback Form',
    'Please provide your feedback about the event',
    '[
        {
            "id": "q1",
            "type": "short_answer",
            "question": "What is your name?",
            "required": true,
            "order": 0
        },
        {
            "id": "q2",
            "type": "multiple_choice",
            "question": "How would you rate the event?",
            "options": ["Excellent", "Good", "Fair", "Poor"],
            "required": true,
            "order": 1
        },
        {
            "id": "q3",
            "type": "linear_scale",
            "question": "On a scale of 1-5, how likely are you to recommend this event?",
            "min_value": 1,
            "max_value": 5,
            "min_label": "Not likely",
            "max_label": "Very likely",
            "required": true,
            "order": 2
        },
        {
            "id": "q4",
            "type": "checkbox",
            "question": "Which aspects did you enjoy? (Select all that apply)",
            "options": ["Content", "Speakers", "Venue", "Food", "Networking"],
            "required": false,
            "order": 3
        },
        {
            "id": "q5",
            "type": "paragraph",
            "question": "Additional comments or suggestions:",
            "required": false,
            "order": 4
        }
    ]'::jsonb,
    'PUBLISHED',
    '{
        "allow_multiple_submissions": false,
        "show_progress_bar": true,
        "shuffle_questions": false,
        "collect_email": true,
        "send_confirmation": false
    }'::jsonb
)
ON CONFLICT DO NOTHING;

