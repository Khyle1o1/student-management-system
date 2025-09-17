-- Enable Row Level Security (RLS) and add safe baseline policies
-- This migration is idempotent and only applies to existing tables.

DO $$
BEGIN
    -- Helper: enable RLS if table exists and RLS not already enabled
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';

        -- Deny by default for anon
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_no_anon'
        ) THEN
            EXECUTE 'CREATE POLICY users_no_anon ON public.users FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;

        -- Admins can do everything (assumes Postgres role "service_role" used by Supabase service key)
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_service_all'
        ) THEN
            EXECUTE 'CREATE POLICY users_service_all ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;

        -- Authenticated users can view their own user row by id (when using PostgREST)
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_read_own'
        ) THEN
            EXECUTE 'CREATE POLICY users_read_own ON public.users FOR SELECT TO authenticated USING (id = auth.uid())';
        END IF;
        -- Allow authenticated to update their own non-privileged fields
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_own'
        ) THEN
            EXECUTE 'CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())';
        END IF;
    END IF;

    -- students
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.students ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_no_anon') THEN
            EXECUTE 'CREATE POLICY students_no_anon ON public.students FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_service_all') THEN
            EXECUTE 'CREATE POLICY students_service_all ON public.students FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_read_own') THEN
            EXECUTE 'CREATE POLICY students_read_own ON public.students FOR SELECT TO authenticated USING (user_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_update_own') THEN
            EXECUTE 'CREATE POLICY students_update_own ON public.students FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_insert_own') THEN
            EXECUTE 'CREATE POLICY students_insert_own ON public.students FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
        END IF;
    END IF;

    -- events
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.events ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_no_anon') THEN
            EXECUTE 'CREATE POLICY events_no_anon ON public.events FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_service_all') THEN
            EXECUTE 'CREATE POLICY events_service_all ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        -- Allow authenticated read for now; tighten if needed by scope in app layer
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_read_all') THEN
            EXECUTE 'CREATE POLICY events_read_all ON public.events FOR SELECT TO authenticated USING (true)';
        END IF;
    END IF;

    -- attendance
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_no_anon') THEN
            EXECUTE 'CREATE POLICY attendance_no_anon ON public.attendance FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_service_all') THEN
            EXECUTE 'CREATE POLICY attendance_service_all ON public.attendance FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        -- Students can see their own attendance
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_read_own') THEN
            EXECUTE 'CREATE POLICY attendance_read_own ON public.attendance FOR SELECT TO authenticated USING (student_id = auth.uid())';
        END IF;
        -- Students can insert/update their own records only if student_id matches
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_write_own') THEN
            EXECUTE 'CREATE POLICY attendance_write_own ON public.attendance FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_update_own') THEN
            EXECUTE 'CREATE POLICY attendance_update_own ON public.attendance FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid())';
        END IF;
    END IF;

    -- evaluations
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evaluations';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='evaluations' AND policyname='evaluations_no_anon') THEN
            EXECUTE 'CREATE POLICY evaluations_no_anon ON public.evaluations FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='evaluations' AND policyname='evaluations_service_all') THEN
            EXECUTE 'CREATE POLICY evaluations_service_all ON public.evaluations FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        -- Read allowed to authenticated for templates and assigned ones; for now allow read-all
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='evaluations' AND policyname='evaluations_read_all') THEN
            EXECUTE 'CREATE POLICY evaluations_read_all ON public.evaluations FOR SELECT TO authenticated USING (true)';
        END IF;
        -- Only service_role inserts/updates by default
    END IF;

    -- event_evaluations
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_evaluations';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.event_evaluations ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_evaluations' AND policyname='event_evaluations_no_anon') THEN
            EXECUTE 'CREATE POLICY event_evaluations_no_anon ON public.event_evaluations FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_evaluations' AND policyname='event_evaluations_service_all') THEN
            EXECUTE 'CREATE POLICY event_evaluations_service_all ON public.event_evaluations FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_evaluations' AND policyname='event_evaluations_read_all') THEN
            EXECUTE 'CREATE POLICY event_evaluations_read_all ON public.event_evaluations FOR SELECT TO authenticated USING (true)';
        END IF;
    END IF;

    -- student_evaluation_responses
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_evaluation_responses';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.student_evaluation_responses ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_evaluation_responses' AND policyname='ser_no_anon') THEN
            EXECUTE 'CREATE POLICY ser_no_anon ON public.student_evaluation_responses FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_evaluation_responses' AND policyname='ser_service_all') THEN
            EXECUTE 'CREATE POLICY ser_service_all ON public.student_evaluation_responses FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_evaluation_responses' AND policyname='ser_read_own') THEN
            EXECUTE 'CREATE POLICY ser_read_own ON public.student_evaluation_responses FOR SELECT TO authenticated USING (student_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_evaluation_responses' AND policyname='ser_insert_own') THEN
            EXECUTE 'CREATE POLICY ser_insert_own ON public.student_evaluation_responses FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_evaluation_responses' AND policyname='ser_update_own') THEN
            EXECUTE 'CREATE POLICY ser_update_own ON public.student_evaluation_responses FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid())';
        END IF;
    END IF;

    -- certificate_templates
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certificate_templates';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_templates' AND policyname='ct_no_anon') THEN
            EXECUTE 'CREATE POLICY ct_no_anon ON public.certificate_templates FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_templates' AND policyname='ct_service_all') THEN
            EXECUTE 'CREATE POLICY ct_service_all ON public.certificate_templates FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_templates' AND policyname='ct_read_all') THEN
            EXECUTE 'CREATE POLICY ct_read_all ON public.certificate_templates FOR SELECT TO authenticated USING (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_templates' AND policyname='ct_insert_creator') THEN
            EXECUTE 'CREATE POLICY ct_insert_creator ON public.certificate_templates FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_templates' AND policyname='ct_update_creator') THEN
            EXECUTE 'CREATE POLICY ct_update_creator ON public.certificate_templates FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid())';
        END IF;
    END IF;

    -- event_certificate_templates
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_certificate_templates';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.event_certificate_templates ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_certificate_templates' AND policyname='ect_no_anon') THEN
            EXECUTE 'CREATE POLICY ect_no_anon ON public.event_certificate_templates FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_certificate_templates' AND policyname='ect_service_all') THEN
            EXECUTE 'CREATE POLICY ect_service_all ON public.event_certificate_templates FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_certificate_templates' AND policyname='ect_read_all') THEN
            EXECUTE 'CREATE POLICY ect_read_all ON public.event_certificate_templates FOR SELECT TO authenticated USING (true)';
        END IF;
    END IF;

    -- certificates
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certificates';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificates' AND policyname='cert_no_anon') THEN
            EXECUTE 'CREATE POLICY cert_no_anon ON public.certificates FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificates' AND policyname='cert_service_all') THEN
            EXECUTE 'CREATE POLICY cert_service_all ON public.certificates FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        -- Students can read their own certificates only when is_accessible
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificates' AND policyname='cert_read_own_accessible') THEN
            EXECUTE 'CREATE POLICY cert_read_own_accessible ON public.certificates FOR SELECT TO authenticated USING (student_id = auth.uid() AND coalesce(is_accessible, false))';
        END IF;
    END IF;

    -- certificate_access_log
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certificate_access_log';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.certificate_access_log ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_access_log' AND policyname='cal_no_anon') THEN
            EXECUTE 'CREATE POLICY cal_no_anon ON public.certificate_access_log FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_access_log' AND policyname='cal_service_all') THEN
            EXECUTE 'CREATE POLICY cal_service_all ON public.certificate_access_log FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_access_log' AND policyname='cal_read_own') THEN
            EXECUTE 'CREATE POLICY cal_read_own ON public.certificate_access_log FOR SELECT TO authenticated USING (student_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='certificate_access_log' AND policyname='cal_insert_own') THEN
            EXECUTE 'CREATE POLICY cal_insert_own ON public.certificate_access_log FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid())';
        END IF;
    END IF;

    -- notifications
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_no_anon') THEN
            EXECUTE 'CREATE POLICY notif_no_anon ON public.notifications FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_service_all') THEN
            EXECUTE 'CREATE POLICY notif_service_all ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_read_own') THEN
            EXECUTE 'CREATE POLICY notif_read_own ON public.notifications FOR SELECT TO authenticated USING ((student_id = auth.uid()) OR (user_id = auth.uid()))';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_insert_own') THEN
            EXECUTE 'CREATE POLICY notif_insert_own ON public.notifications FOR INSERT TO authenticated WITH CHECK ((student_id = auth.uid()) OR (user_id = auth.uid()))';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_update_own') THEN
            EXECUTE 'CREATE POLICY notif_update_own ON public.notifications FOR UPDATE TO authenticated USING ((student_id = auth.uid()) OR (user_id = auth.uid())) WITH CHECK ((student_id = auth.uid()) OR (user_id = auth.uid()))';
        END IF;
    END IF;

    -- fee_structures
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fee_structures';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fee_structures' AND policyname='fees_no_anon') THEN
            EXECUTE 'CREATE POLICY fees_no_anon ON public.fee_structures FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fee_structures' AND policyname='fees_service_all') THEN
            EXECUTE 'CREATE POLICY fees_service_all ON public.fee_structures FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fee_structures' AND policyname='fees_read_all') THEN
            EXECUTE 'CREATE POLICY fees_read_all ON public.fee_structures FOR SELECT TO authenticated USING (true)';
        END IF;
    END IF;

    -- payments
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments';
    IF FOUND THEN
        EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='pay_no_anon') THEN
            EXECUTE 'CREATE POLICY pay_no_anon ON public.payments FOR ALL TO anon USING (false) WITH CHECK (false)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='pay_service_all') THEN
            EXECUTE 'CREATE POLICY pay_service_all ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='pay_read_own') THEN
            EXECUTE 'CREATE POLICY pay_read_own ON public.payments FOR SELECT TO authenticated USING (student_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='pay_insert_own') THEN
            EXECUTE 'CREATE POLICY pay_insert_own ON public.payments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='pay_update_own') THEN
            EXECUTE 'CREATE POLICY pay_update_own ON public.payments FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid())';
        END IF;
    END IF;
END$$;


