-- Migration: Add scope fields to fee_structures table
-- This migration adds scope functionality to allow University-wide, College-wide, and Course-specific fees

-- Add scope fields to fee_structures table
DO $$ 
BEGIN
    -- Add scope_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'scope_type') THEN
        ALTER TABLE fee_structures ADD COLUMN scope_type TEXT NOT NULL DEFAULT 'UNIVERSITY_WIDE';
    END IF;

    -- Add scope_college if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'scope_college') THEN
        ALTER TABLE fee_structures ADD COLUMN scope_college TEXT;
    END IF;

    -- Add scope_course if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'scope_course') THEN
        ALTER TABLE fee_structures ADD COLUMN scope_course TEXT;
    END IF;

    -- Add additional fields that were missing from Prisma schema
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'type') THEN
        ALTER TABLE fee_structures ADD COLUMN type TEXT DEFAULT 'OTHER';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'semester') THEN
        ALTER TABLE fee_structures ADD COLUMN semester TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'school_year') THEN
        ALTER TABLE fee_structures ADD COLUMN school_year TEXT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'is_active') THEN
        ALTER TABLE fee_structures ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'deleted_at') THEN
        ALTER TABLE fee_structures ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add payment tracking fields that may be missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN
        ALTER TABLE payments ADD COLUMN payment_method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'reference') THEN
        ALTER TABLE payments ADD COLUMN reference TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'notes') THEN
        ALTER TABLE payments ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'deleted_at') THEN
        ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing records with default values (separate UPDATE statements)
UPDATE fee_structures SET scope_type = 'UNIVERSITY_WIDE' WHERE scope_type IS NULL;
UPDATE fee_structures SET type = 'OTHER' WHERE type IS NULL;
UPDATE fee_structures SET school_year = EXTRACT(YEAR FROM CURRENT_DATE)::TEXT WHERE school_year IS NULL;
UPDATE fee_structures SET is_active = TRUE WHERE is_active IS NULL;

-- Add constraints for scope validation
ALTER TABLE fee_structures ADD CONSTRAINT check_scope_type 
    CHECK (scope_type IN ('UNIVERSITY_WIDE', 'COLLEGE_WIDE', 'COURSE_SPECIFIC'));

ALTER TABLE fee_structures ADD CONSTRAINT check_fee_type 
    CHECK (type IN ('ORGANIZATION_FEE', 'ACTIVITY_FEE', 'REGISTRATION_FEE', 'LABORATORY_FEE', 'LIBRARY_FEE', 'OTHER'));

-- Add indexes for better performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_structures_scope_type') THEN
        CREATE INDEX idx_fee_structures_scope_type ON fee_structures(scope_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_structures_scope_college') THEN
        CREATE INDEX idx_fee_structures_scope_college ON fee_structures(scope_college) WHERE scope_college IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_structures_scope_course') THEN
        CREATE INDEX idx_fee_structures_scope_course ON fee_structures(scope_course) WHERE scope_course IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_structures_active') THEN
        CREATE INDEX idx_fee_structures_active ON fee_structures(is_active) WHERE is_active = TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_structures_school_year') THEN
        CREATE INDEX idx_fee_structures_school_year ON fee_structures(school_year);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN fee_structures.scope_type IS 'Defines who the fee applies to: UNIVERSITY_WIDE, COLLEGE_WIDE, or COURSE_SPECIFIC';
COMMENT ON COLUMN fee_structures.scope_college IS 'Required when scope_type is COLLEGE_WIDE or COURSE_SPECIFIC - specifies the college';
COMMENT ON COLUMN fee_structures.scope_course IS 'Required when scope_type is COURSE_SPECIFIC - specifies the course';
COMMENT ON COLUMN fee_structures.type IS 'Type of fee: ORGANIZATION_FEE, ACTIVITY_FEE, REGISTRATION_FEE, LABORATORY_FEE, LIBRARY_FEE, OTHER';
COMMENT ON COLUMN fee_structures.semester IS 'Semester the fee applies to (optional)';
COMMENT ON COLUMN fee_structures.school_year IS 'School year the fee applies to';
COMMENT ON COLUMN fee_structures.is_active IS 'Whether the fee is currently active';
COMMENT ON COLUMN fee_structures.deleted_at IS 'Soft delete timestamp'; 