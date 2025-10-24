-- Safe Clear Sample Data Script
-- This script removes ONLY the example sample data from schema.sql
-- It will NOT delete all students, only the specific test accounts

-- Start a transaction
BEGIN;

-- Delete sample students (from schema.sql)
DELETE FROM students 
WHERE student_id IN ('STU001', 'STU002');

-- Delete sample users (from schema.sql)
DELETE FROM users 
WHERE email IN ('student1@example.com', 'student2@example.com', 'admin@example.com');

-- Display remaining counts
SELECT 'Remaining data:' as info;
SELECT 'Students:' as table_name, COUNT(*) as count FROM students;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users;

COMMIT;

SELECT '✅ Sample data from schema.sql removed!' as result;

