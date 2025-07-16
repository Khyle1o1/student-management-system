-- Certificate Template System Migration
-- Adds support for custom certificate templates with design and dynamic fields

DO $$ 
BEGIN
    -- Create certificate_templates table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificate_templates') THEN
        CREATE TABLE certificate_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            background_design JSONB DEFAULT '{}', -- Store background design settings
            dynamic_fields JSONB DEFAULT '[]', -- Store dynamic field configurations
            template_html TEXT, -- Store HTML template
            template_css TEXT, -- Store CSS styles
            is_active BOOLEAN DEFAULT true,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- Create event_certificate_templates table to link events with certificate templates
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_certificate_templates') THEN
        CREATE TABLE event_certificate_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id) -- One certificate template per event
        );
    END IF;

    -- Add certificate_template_id to certificates table for reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'certificate_template_id') THEN
        ALTER TABLE certificates ADD COLUMN certificate_template_id UUID REFERENCES certificate_templates(id);
    END IF;

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_certificate_templates_active ON certificate_templates(is_active);
    CREATE INDEX IF NOT EXISTS idx_certificate_templates_created_by ON certificate_templates(created_by);
    CREATE INDEX IF NOT EXISTS idx_event_certificate_templates_event_id ON event_certificate_templates(event_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_template_id ON certificates(certificate_template_id);

    -- Add comments for documentation
    COMMENT ON TABLE certificate_templates IS 'Stores certificate template designs and configurations';
    COMMENT ON COLUMN certificate_templates.background_design IS 'JSON object containing background color, pattern, logo settings';
    COMMENT ON COLUMN certificate_templates.dynamic_fields IS 'JSON array of dynamic field configurations (student_name, event_name, date, etc.)';
    COMMENT ON COLUMN certificate_templates.template_html IS 'HTML template for certificate generation';
    COMMENT ON COLUMN certificate_templates.template_css IS 'CSS styles for certificate template';
    
    COMMENT ON TABLE event_certificate_templates IS 'Links events to certificate templates';
    COMMENT ON COLUMN certificates.certificate_template_id IS 'Reference to the certificate template used for generation';

END $$; 