-- Recreate functions with explicit search_path to avoid role-mutable search path

-- generate_certificate_number(): ensure stable search path
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS VARCHAR(100)
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    cert_number VARCHAR(100);
    counter INTEGER := 1;
BEGIN
    LOOP
        cert_number := 'CERT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        IF NOT EXISTS (SELECT 1 FROM public.certificates WHERE certificate_number = cert_number) THEN
            RETURN cert_number;
        END IF;
        counter := counter + 1;
    END LOOP;
END;
$$;

-- update_updated_at_column(): ensure stable search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


