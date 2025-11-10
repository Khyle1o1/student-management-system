-- ============================================
-- ENABLE RLS FOR FORMS SYSTEM TABLES
-- Date: 2025-11-09
-- Purpose: Enable Row Level Security on all forms system tables
-- ============================================

BEGIN;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE evaluation_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================

DROP POLICY IF EXISTS "evaluation_forms_select_policy" ON evaluation_forms;
DROP POLICY IF EXISTS "evaluation_forms_insert_policy" ON evaluation_forms;
DROP POLICY IF EXISTS "evaluation_forms_update_policy" ON evaluation_forms;
DROP POLICY IF EXISTS "evaluation_forms_delete_policy" ON evaluation_forms;

DROP POLICY IF EXISTS "form_responses_select_policy" ON form_responses;
DROP POLICY IF EXISTS "form_responses_insert_policy" ON form_responses;
DROP POLICY IF EXISTS "form_responses_update_policy" ON form_responses;
DROP POLICY IF EXISTS "form_responses_delete_policy" ON form_responses;

DROP POLICY IF EXISTS "form_analytics_select_policy" ON form_analytics;
DROP POLICY IF EXISTS "form_analytics_insert_policy" ON form_analytics;
DROP POLICY IF EXISTS "form_analytics_update_policy" ON form_analytics;
DROP POLICY IF EXISTS "form_analytics_delete_policy" ON form_analytics;

DROP POLICY IF EXISTS "form_sections_select_policy" ON form_sections;
DROP POLICY IF EXISTS "form_sections_insert_policy" ON form_sections;
DROP POLICY IF EXISTS "form_sections_update_policy" ON form_sections;
DROP POLICY IF EXISTS "form_sections_delete_policy" ON form_sections;

-- ============================================
-- EVALUATION FORMS POLICIES
-- ============================================

-- SELECT: Users can view published forms and their own forms
CREATE POLICY "evaluation_forms_select_policy" ON evaluation_forms
  FOR SELECT
  USING (
    status = 'PUBLISHED' 
    OR 
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG')
    )
  );

-- INSERT: Only ADMIN, COLLEGE_ORG, COURSE_ORG can create forms
CREATE POLICY "evaluation_forms_insert_policy" ON evaluation_forms
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG')
    )
  );

-- UPDATE: Users can only update their own forms
CREATE POLICY "evaluation_forms_update_policy" ON evaluation_forms
  FOR UPDATE
  USING (
    created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'COLLEGE_ORG', 'COURSE_ORG')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- DELETE: Users can only delete their own forms (ADMIN can delete any)
CREATE POLICY "evaluation_forms_delete_policy" ON evaluation_forms
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ============================================
-- FORM RESPONSES POLICIES
-- ============================================

-- SELECT: Form creators and ADMIN can view all responses, users can view their own
CREATE POLICY "form_responses_select_policy" ON form_responses
  FOR SELECT
  USING (
    respondent_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM evaluation_forms 
      WHERE id = form_responses.form_id 
      AND created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- INSERT: Anyone can submit responses (authenticated or anonymous based on form settings)
CREATE POLICY "form_responses_insert_policy" ON form_responses
  FOR INSERT
  WITH CHECK (
    -- Either the user is authenticated and matches respondent_id
    (auth.uid() IS NOT NULL AND respondent_id = auth.uid())
    OR
    -- Or it's an anonymous response (respondent_id is NULL)
    (respondent_id IS NULL)
  );

-- UPDATE: No one can update responses (immutable)
-- (No update policy = no updates allowed)

-- DELETE: Only ADMIN can delete responses
CREATE POLICY "form_responses_delete_policy" ON form_responses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ============================================
-- FORM ANALYTICS POLICIES
-- ============================================

-- SELECT: Form creators and ADMIN can view analytics
CREATE POLICY "form_analytics_select_policy" ON form_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_forms 
      WHERE id = form_analytics.form_id 
      AND created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- INSERT: System only (service_role)
CREATE POLICY "form_analytics_insert_policy" ON form_analytics
  FOR INSERT
  WITH CHECK (false); -- Only service_role can insert

-- UPDATE: System only (service_role)
CREATE POLICY "form_analytics_update_policy" ON form_analytics
  FOR UPDATE
  USING (false); -- Only service_role can update

-- DELETE: ADMIN only
CREATE POLICY "form_analytics_delete_policy" ON form_analytics
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ============================================
-- FORM SECTIONS POLICIES
-- ============================================

-- SELECT: Anyone can view sections of published forms
CREATE POLICY "form_sections_select_policy" ON form_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_forms 
      WHERE id = form_sections.form_id 
      AND (status = 'PUBLISHED' OR created_by = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- INSERT: Form creators can add sections to their forms
CREATE POLICY "form_sections_insert_policy" ON form_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluation_forms 
      WHERE id = form_sections.form_id 
      AND created_by = auth.uid()
    )
  );

-- UPDATE: Form creators can update sections in their forms
CREATE POLICY "form_sections_update_policy" ON form_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_forms 
      WHERE id = form_sections.form_id 
      AND created_by = auth.uid()
    )
  );

-- DELETE: Form creators can delete sections from their forms
CREATE POLICY "form_sections_delete_policy" ON form_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_forms 
      WHERE id = form_sections.form_id 
      AND created_by = auth.uid()
    )
  );

-- ============================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant table permissions
GRANT SELECT ON evaluation_forms TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON evaluation_forms TO authenticated;

GRANT SELECT ON form_responses TO authenticated, anon;
GRANT INSERT ON form_responses TO authenticated, anon;
GRANT DELETE ON form_responses TO authenticated;

GRANT SELECT ON form_analytics TO authenticated;
GRANT DELETE ON form_analytics TO authenticated;

GRANT SELECT ON form_sections TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON form_sections TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that RLS is enabled on all tables:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('evaluation_forms', 'form_responses', 'form_analytics', 'form_sections');
-- (All should show rowsecurity = true)

-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('evaluation_forms', 'form_responses', 'form_analytics', 'form_sections')
-- ORDER BY tablename, policyname;

