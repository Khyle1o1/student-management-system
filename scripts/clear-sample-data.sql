-- Clear Sample Data Script
-- This script removes all sample/test data from the database
-- USE WITH CAUTION: This will delete existing student records

-- WARNING: Make sure to backup your database before running this!

-- Start a transaction (rollback if something goes wrong)
BEGIN;

-- Display counts before deletion
SELECT 'Current counts:' as info;
SELECT 'Students:' as table_name, COUNT(*) as count FROM students;
SELECT 'Users (Students):' as table_name, COUNT(*) as count FROM users WHERE role = 'STUDENT';
SELECT 'Attendance:' as table_name, COUNT(*) as count FROM attendance;
SELECT 'Payments:' as table_name, COUNT(*) as count FROM payments;

-- Delete attendance records (cascade will handle this, but being explicit)
DELETE FROM attendance 
WHERE student_id IN (SELECT id FROM students);

-- Delete payment records
DELETE FROM payments 
WHERE student_id IN (SELECT id FROM students);

-- Delete certificate evaluations (if exists)
DELETE FROM certificate_evaluations 
WHERE student_id IN (SELECT id FROM students);

-- Delete students
DELETE FROM students;

-- Delete student user accounts (keep admin accounts)
DELETE FROM users 
WHERE role = 'STUDENT';

-- Display counts after deletion
SELECT 'Counts after deletion:' as info;
SELECT 'Students:' as table_name, COUNT(*) as count FROM students;
SELECT 'Users (Students):' as table_name, COUNT(*) as count FROM users WHERE role = 'STUDENT';
SELECT 'Attendance:' as table_name, COUNT(*) as count FROM attendance;
SELECT 'Payments:' as table_name, COUNT(*) as count FROM payments;

-- If everything looks good, commit the transaction
-- Otherwise, you can rollback by running: ROLLBACK;
COMMIT;

-- Success message
SELECT '✅ Sample data cleared successfully! You can now upload real student data.' as result;

