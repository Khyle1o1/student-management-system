/**
 * Utility functions for handling fee scope filtering
 */

interface Student {
  college: string;
  course: string;
  [key: string]: any;
}

/**
 * Builds the correct Supabase query filter for fees based on student scope
 * @param student - The student object with college and course information
 * @returns The filter string for Supabase .or() method
 */
export function buildFeesScopeFilter(student: Student): string {
  // Filter logic:
  // 1. UNIVERSITY_WIDE: All students
  // 2. COLLEGE_WIDE: Students from that specific college only
  // 3. COURSE_SPECIFIC: Students from that specific college AND course only
  
  return `scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq."${student.college}"),and(scope_type.eq.COURSE_SPECIFIC,scope_college.eq."${student.college}",scope_course.eq."${student.course}")`
}

/**
 * Checks if a fee applies to a specific student based on scope
 * @param fee - The fee object with scope information
 * @param student - The student object with college and course information
 * @returns true if the fee applies to the student, false otherwise
 */
export function doesFeeApplyToStudent(fee: any, student: Student): boolean {
  switch (fee.scope_type) {
    case 'UNIVERSITY_WIDE':
      return true;
      
    case 'COLLEGE_WIDE':
      return fee.scope_college === student.college;
      
    case 'COURSE_SPECIFIC':
      return fee.scope_college === student.college && fee.scope_course === student.course;
      
    default:
      // Default to university-wide if scope_type is unknown
      return true;
  }
}

/**
 * Filters an array of fees to only include those that apply to the student
 * @param fees - Array of fee objects
 * @param student - The student object with college and course information
 * @returns Filtered array of fees that apply to the student
 */
export function filterFeesForStudent(fees: any[], student: Student): any[] {
  return fees.filter(fee => doesFeeApplyToStudent(fee, student));
} 