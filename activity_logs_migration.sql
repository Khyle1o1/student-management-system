-- Activity Logs Migration
-- Dedicated table for system activity timeline with role-scoped visibility

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'activity_logs'
    ) THEN
        CREATE TABLE activity_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            user_name VARCHAR(255),
            role VARCHAR(50) NOT NULL,
            action VARCHAR(100) NOT NULL,
            module VARCHAR(50) NOT NULL, -- fees, events, attendance, certificates, evaluations, users, permissions, settings, etc.
            target_type VARCHAR(100),    -- event, fee, student, certificate, evaluation, etc.
            target_id UUID,
            target_name VARCHAR(255),
            college VARCHAR(150),        -- College identifier/name for scoping
            course VARCHAR(150),         -- Course identifier/name for scoping
            details JSONB,               -- Optional previous vs new values or extra context
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        COMMENT ON TABLE activity_logs IS 'Central audit/activity log for system actions with role-scoped visibility';
        COMMENT ON COLUMN activity_logs.action IS 'Short machine-readable action key, e.g. EVENT_CREATED, PAYMENT_APPROVED';
        COMMENT ON COLUMN activity_logs.module IS 'High-level module where the action occurred (events, fees, attendance, certificates, evaluations, users, settings, etc.)';
        COMMENT ON COLUMN activity_logs.details IS 'Optional JSON payload with previous vs new values or additional context';
    END IF;
END $$;

-- Indexes for efficient filtering & ordering
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_created_at') THEN
        CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_user_id') THEN
        CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_role') THEN
        CREATE INDEX idx_activity_logs_role ON activity_logs(role);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_college') THEN
        CREATE INDEX idx_activity_logs_college ON activity_logs(college);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_course') THEN
        CREATE INDEX idx_activity_logs_course ON activity_logs(course);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_module') THEN
        CREATE INDEX idx_activity_logs_module ON activity_logs(module);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_action') THEN
        CREATE INDEX idx_activity_logs_action ON activity_logs(action);
    END IF;
END $$;


