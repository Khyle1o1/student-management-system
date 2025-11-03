-- Fix missing fee assignments for students
-- This script will assign fees to students who should have them but don't

-- Find students who are missing the SSC FEE (or any other fee)
-- Replace 'fee_id_here' with your actual fee ID from the database

-- Example: To find students missing SSC FEE
-- First, get the fee ID:
-- SELECT id, name FROM fee_structures WHERE name = 'SSC FEE' AND is_active = true;

-- Then insert missing payment records
-- Replace '644628bf-6578-438d-9494-e370ed82c369' with your actual fee ID

WITH fee_to_assign AS (
  -- Change this to your fee details
  SELECT 
    id as fee_id,
    amount,
    scope_type,
    scope_college,
    scope_course
  FROM fee_structures 
  WHERE id = '644628bf-6578-438d-9494-e370ed82c369' -- REPLACE WITH YOUR FEE ID
    AND is_active = true
    AND deleted_at IS NULL
),
eligible_students AS (
  SELECT s.id as student_id
  FROM students s
  CROSS JOIN fee_to_assign f
  WHERE (s.archived IS NULL OR s.archived = false)
    -- Apply scope filters
    AND (
      -- University-wide: all students
      f.scope_type = 'UNIVERSITY_WIDE'
      -- College-wide: students in that college
      OR (f.scope_type = 'COLLEGE_WIDE' AND s.college = f.scope_college)
      -- Course-specific: students in that course
      OR (f.scope_type = 'COURSE_SPECIFIC' AND s.course = f.scope_course)
    )
    -- Exclude students who already have this fee
    AND NOT EXISTS (
      SELECT 1 
      FROM payments p 
      WHERE p.student_id = s.id 
        AND p.fee_id = f.fee_id
    )
)
-- Insert missing payment records and return count
INSERT INTO payments (student_id, fee_id, amount, status, payment_date)
SELECT 
  e.student_id,
  f.fee_id,
  f.amount,
  'UNPAID',
  NULL
FROM eligible_students e
CROSS JOIN fee_to_assign f
RETURNING *;

-- Then check total assignments for this fee
SELECT 
  'Verification: Total students with this fee' as description,
  COUNT(*) as count
FROM payments
WHERE fee_id = '644628bf-6578-438d-9494-e370ed82c369'; -- REPLACE WITH YOUR FEE ID

