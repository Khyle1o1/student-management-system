-- Fix the update_form_analytics function to avoid nested aggregate error
-- The issue is using COUNT(*) inside jsonb_object_agg

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

    -- Calculate question statistics (fixed version - avoid nested aggregates)
    -- First, get all question IDs with their counts
    WITH question_counts AS (
        SELECT 
            jsonb_object_keys(answers) as question_id,
            COUNT(*) as q_count
        FROM form_responses
        WHERE form_id = form_uuid
        GROUP BY jsonb_object_keys(answers)
    )
    SELECT jsonb_object_agg(
        question_id,
        jsonb_build_object(
            'response_count', q_count,
            'last_updated', NOW()
        )
    ) INTO question_stats
    FROM question_counts;

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

