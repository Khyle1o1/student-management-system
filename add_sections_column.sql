-- Migration to add sections column to existing evaluation_forms table
-- Run this if you already created the evaluation_forms table without sections

DO $$
BEGIN
    -- Add sections column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'evaluation_forms' 
        AND column_name = 'sections'
    ) THEN
        ALTER TABLE evaluation_forms 
        ADD COLUMN sections JSONB DEFAULT '[]';
        
        RAISE NOTICE 'Added sections column to evaluation_forms table';
    ELSE
        RAISE NOTICE 'sections column already exists';
    END IF;
    
    -- Update the comment
    COMMENT ON COLUMN evaluation_forms.sections IS 'JSONB array of section objects with id, title, description, and order';
    
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'evaluation_forms'
ORDER BY ordinal_position;

