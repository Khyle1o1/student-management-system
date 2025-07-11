export const COLLEGES = [
  "College of Arts and Sciences",
  "College of Business",
  "College of Education",
  "College of Nursing",
  "College of Technologies",
  "College of Public Administration and Governance",
] as const;

export type College = typeof COLLEGES[number];

export const COURSES_BY_COLLEGE: Record<College, string[]> = {
  "College of Arts and Sciences": [
    "Bachelor of Arts in Economics",
    "Bachelor of Arts in English Language",
    "Bachelor of Arts in Philosophy Pre-Law",
    "Bachelor of Arts in Philosophy Teaching Track",
    "Bachelor of Arts in Sociology",
    "Bachelor of Science in Biology Major in Biotechnology",
    "Bachelor of Science in Community Development",
    "Bachelor of Science in Development Communication",
    "Bachelor of Science in Environmental Science major in Environmental Heritage Studies",
    "Bachelor of Science in Mathematics",
  ],
  "College of Business": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Business Administration major in Financial Management",
    "Bachelor of Science in Hospitality Management",
  ],
  "College of Education": [
    "Bachelor of Early Childhood Education",
    "Bachelor of Elementary Education",
    "Bachelor of Physical Education",
    "Bachelor of Secondary Education Major in English",
    "Bachelor of Secondary Education Major in Filipino",
    "Bachelor of Secondary Education Major in Mathematics",
    "Bachelor of Secondary Education Major in Science",
    "Bachelor of Secondary Education Major in Social Studies",
  ],
  "College of Nursing": [
    "Bachelor of Science in Nursing",
  ],
  "College of Technologies": [
    "Bachelor of Science in Automotive Technology",
    "Bachelor of Science in Electronics Technology",
    "Bachelor of Science in Entertainment and Multimedia Computing Major in Digital Animation Technology",
    "Bachelor of Science in Food Technology",
    "Bachelor of Science in Information Technology",
  ],
  "College of Public Administration and Governance": [
    "Bachelor of Public Administration",
  ],
};

// Helper function to get all available courses
export const getAllCourses = () => {
  return Object.values(COURSES_BY_COLLEGE).flat();
};

// Helper function to get college for a given course
export const getCollegeForCourse = (course: string): College | undefined => {
  return Object.entries(COURSES_BY_COLLEGE).find(([_, courses]) => 
    courses.includes(course)
  )?.[0] as College | undefined;
};

// Helper function to validate if a college exists
export const isValidCollege = (college: string): college is College => {
  return COLLEGES.includes(college as College);
};

// Helper function to validate if a course exists
export const isValidCourse = (course: string): boolean => {
  return getAllCourses().includes(course);
};

// Event scope constants
export const EVENT_SCOPE_TYPES = [
  "UNIVERSITY_WIDE",
  "COLLEGE_WIDE", 
  "COURSE_SPECIFIC"
] as const;

export type EventScopeType = typeof EVENT_SCOPE_TYPES[number];

export const EVENT_SCOPE_LABELS: Record<EventScopeType, string> = {
  "UNIVERSITY_WIDE": "University-wide",
  "COLLEGE_WIDE": "College-wide",
  "COURSE_SPECIFIC": "Course-specific"
};

export const EVENT_SCOPE_DESCRIPTIONS: Record<EventScopeType, string> = {
  "UNIVERSITY_WIDE": "All students across all colleges can attend and will be included in attendance and report generation",
  "COLLEGE_WIDE": "Only students within a specific college can attend and be included in reports",
  "COURSE_SPECIFIC": "Only students from a specific course can attend and be tracked"
};

// Helper function to validate if an event scope type exists
export const isValidEventScope = (scope: string): scope is EventScopeType => {
  return EVENT_SCOPE_TYPES.includes(scope as EventScopeType);
}; 