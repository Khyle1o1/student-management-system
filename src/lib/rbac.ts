/**
 * Role-Based Access Control (RBAC) Utilities
 * Manages permissions for different user roles in the system
 * 
 * Note: This is for ADMINISTRATIVE users only (users table)
 * Students are managed separately in the students table
 */

export type UserRole = 'ADMIN' | 'COLLEGE_ORG' | 'COURSE_ORG';
export type UserStatus = 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';

export interface UserPermissions {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  status: UserStatus;
  assigned_college?: string | null;
  assigned_course?: string | null;
  assigned_courses?: string[] | null;
}

/**
 * Check if user is a System Administrator (Supreme Student Council)
 */
export function isAdmin(user: UserPermissions | null): boolean {
  return user?.role === 'ADMIN' && user?.status === 'ACTIVE';
}

/**
 * Check if user is a College Organization
 */
export function isCollegeOrg(user: UserPermissions | null): boolean {
  return user?.role === 'COLLEGE_ORG' && user?.status === 'ACTIVE';
}

/**
 * Check if user is a Course Organization
 */
export function isCourseOrg(user: UserPermissions | null): boolean {
  return user?.role === 'COURSE_ORG' && user?.status === 'ACTIVE';
}

/**
 * Note: Students are managed in the students table, not in users table
 * This RBAC module is only for administrative users
 */

/**
 * Check if user has access to manage other users
 */
export function canManageUsers(user: UserPermissions | null): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  // Only ADMIN can manage users
  return user.role === 'ADMIN';
}

/**
 * Check if user can create a specific role
 */
export function canCreateRole(user: UserPermissions | null, targetRole: UserRole): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  // Only ADMIN can create roles
  return user.role === 'ADMIN';
}

/**
 * Check if user has access to a specific college
 */
export function hasCollegeAccess(
  user: UserPermissions | null, 
  targetCollege: string
): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  // ADMIN has access to all colleges
  if (user.role === 'ADMIN') return true;
  
  // COLLEGE_ORG has access to their assigned college
  if (user.role === 'COLLEGE_ORG' && user.assigned_college === targetCollege) {
    return true;
  }
  
  // COURSE_ORG has access to their assigned college
  if (user.role === 'COURSE_ORG' && user.assigned_college === targetCollege) {
    return true;
  }
  
  return false;
}

/**
 * Check if user has access to a specific course
 */
export function hasCourseAccess(
  user: UserPermissions | null,
  targetCollege: string,
  targetCourse: string
): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  // ADMIN has access to all courses
  if (user.role === 'ADMIN') return true;
  
  // COLLEGE_ORG has access to all courses in their college
  if (user.role === 'COLLEGE_ORG' && user.assigned_college === targetCollege) {
    return true;
  }
  
  // COURSE_ORG has access to their specific course(s)
  if (user.role === 'COURSE_ORG' && user.assigned_college === targetCollege) {
    if (user.assigned_course && user.assigned_course === targetCourse) return true;
    if (Array.isArray(user.assigned_courses) && user.assigned_courses.includes(targetCourse)) return true;
  }
  
  return false;
}

/**
 * Check if user has access to students
 */
export function hasStudentAccess(
  user: UserPermissions | null,
  studentCollege: string,
  studentCourse: string
): boolean {
  return hasCourseAccess(user, studentCollege, studentCourse);
}

/**
 * Check if user has access to events
 */
export function hasEventAccess(
  user: UserPermissions | null,
  eventScopeType: string,
  eventCollege?: string | null,
  eventCourse?: string | null
): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  // ADMIN has access to all events
  if (user.role === 'ADMIN') return true;
  
  // University-wide events are only accessible by ADMIN (already checked above)
  if (eventScopeType === 'UNIVERSITY_WIDE') {
    return false;
  }
  
  // College-specific events
  if (eventScopeType === 'COLLEGE' && eventCollege) {
    return hasCollegeAccess(user, eventCollege);
  }
  
  // Course-specific events
  if (eventScopeType === 'COURSE' && eventCollege && eventCourse) {
    return hasCourseAccess(user, eventCollege, eventCourse);
  }
  
  return false;
}

/**
 * Check if user has access to fees
 */
export function hasFeeAccess(
  user: UserPermissions | null,
  feeScopeType: string,
  feeCollege?: string | null,
  feeCourse?: string | null
): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  // ADMIN has access to all fees
  if (user.role === 'ADMIN') return true;
  
  // University-wide fees are only accessible by ADMIN (already checked above)
  if (feeScopeType === 'UNIVERSITY_WIDE') {
    return false;
  }
  
  // College-specific fees
  if (feeScopeType === 'COLLEGE' && feeCollege) {
    return hasCollegeAccess(user, feeCollege);
  }
  
  // Course-specific fees
  if (feeScopeType === 'COURSE' && feeCollege && feeCourse) {
    return hasCourseAccess(user, feeCollege, feeCourse);
  }
  
  return false;
}

/**
 * Check if user has access to reports
 */
export function hasReportAccess(
  user: UserPermissions | null,
  reportCollege?: string | null,
  reportCourse?: string | null
): boolean {
  if (!user || user.status !== 'ACTIVE') return false;
  
  // ADMIN has access to all reports
  if (user.role === 'ADMIN') return true;
  
  // If no specific college/course, only admin can access (already checked above)
  if (!reportCollege && !reportCourse) {
    return false;
  }
  
  // College-specific reports
  if (reportCollege && !reportCourse) {
    return hasCollegeAccess(user, reportCollege);
  }
  
  // Course-specific reports
  if (reportCollege && reportCourse) {
    return hasCourseAccess(user, reportCollege, reportCourse);
  }
  
  return false;
}

/**
 * Get filter criteria for database queries based on user role
 */
export function getAccessFilter(user: UserPermissions | null): {
  type: 'ALL' | 'COLLEGE' | 'COURSE' | 'NONE';
  college?: string;
  course?: string;
} {
  if (!user || user.status !== 'ACTIVE') {
    return { type: 'NONE' };
  }
  
  if (user.role === 'ADMIN') {
    return { type: 'ALL' };
  }
  
  if (user.role === 'COLLEGE_ORG' && user.assigned_college) {
    return {
      type: 'COLLEGE',
      college: user.assigned_college
    };
  }
  
  if (user.role === 'COURSE_ORG' && user.assigned_college && (user.assigned_course || (user.assigned_courses && user.assigned_courses.length > 0))) {
    return {
      type: 'COURSE',
      college: user.assigned_college,
      course: user.assigned_course || (user.assigned_courses ? user.assigned_courses[0] : undefined),
    };
  }
  
  return { type: 'NONE' };
}

/**
 * Get role display name (for administrative users only)
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    'ADMIN': 'System Administrator (SSC)',
    'COLLEGE_ORG': 'College Organization',
    'COURSE_ORG': 'Course Organization',
  };
  
  return roleNames[role] || role;
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: UserStatus): string {
  const statusNames: Record<UserStatus, string> = {
    'ACTIVE': 'Active',
    'ARCHIVED': 'Archived',
    'SUSPENDED': 'Suspended'
  };
  
  return statusNames[status] || status;
}

/**
 * Validate user assignment based on role
 */
export function validateUserAssignment(
  role: UserRole,
  assignedCollege?: string | null,
  assignedCourse?: string | null
): { valid: boolean; error?: string } {
  if (role === 'ADMIN') {
    // Admin shouldn't have college/course assignments
    if (assignedCollege || assignedCourse) {
      return {
        valid: false,
        error: 'System Administrator should not have college or course assignments'
      };
    }
    return { valid: true };
  }
  
  if (role === 'COLLEGE_ORG') {
    // College Org must have college, but not course
    if (!assignedCollege) {
      return {
        valid: false,
        error: 'College Organization must be assigned to a college'
      };
    }
    if (assignedCourse) {
      return {
        valid: false,
        error: 'College Organization should not be assigned to a specific course'
      };
    }
    return { valid: true };
  }
  
  if (role === 'COURSE_ORG') {
    // Course Org must have both college and at least one course
    if (!assignedCollege) {
      return {
        valid: false,
        error: 'Course Organization must be assigned to a college'
      };
    }
    if (!assignedCourse) {
      return {
        valid: false,
        error: 'Course Organization must be assigned to a course'
      };
    }
    return { valid: true };
  }
  
  // This function is only for administrative users
  // Students are managed separately
  return {
    valid: false,
    error: 'Invalid role for administrative user'
  };
}

