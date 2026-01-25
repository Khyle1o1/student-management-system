/**
 * Route Protection Utilities
 * Server-side middleware helpers for protecting API routes based on user roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { 
  canAccessDashboard, 
  canAccessEvents, 
  canAccessAttendance, 
  canAccessCertificates, 
  canAccessEvaluations, 
  canAccessIntramurals, 
  canAccessSettings, 
  canAccessUserManagement,
  type UserPermissions 
} from './rbac';

/**
 * Get user session and check authentication
 */
export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    };
  }

  return {
    authorized: true,
    user: session.user,
    session
  };
}

/**
 * Check if user has specific permission
 */
export function checkPermission(
  user: UserPermissions,
  permissionCheck: (user: UserPermissions) => boolean
): { authorized: boolean; response?: NextResponse } {
  if (!permissionCheck(user)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - You do not have permission to access this resource' },
        { status: 403 }
      )
    };
  }

  return { authorized: true };
}

/**
 * Middleware: Require Dashboard Access
 */
export async function requireDashboardAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessDashboard);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require Events Access
 */
export async function requireEventsAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessEvents);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require Attendance Access
 */
export async function requireAttendanceAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessAttendance);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require Certificates Access
 */
export async function requireCertificatesAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessCertificates);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require Evaluations Access
 */
export async function requireEvaluationsAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessEvaluations);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require Intramurals Access
 */
export async function requireIntramuralsAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessIntramurals);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require Settings Access
 */
export async function requireSettingsAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessSettings);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require User Management Access
 */
export async function requireUserManagementAccess() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  const permResult = checkPermission(authResult.user as UserPermissions, canAccessUserManagement);
  if (!permResult.authorized) return permResult;

  return { authorized: true, user: authResult.user, session: authResult.session };
}

/**
 * Middleware: Require Admin Role Only
 */
export async function requireAdminRole() {
  const authResult = await requireAuth();
  if (!authResult.authorized || !authResult.user) return authResult;

  if (authResult.user.role !== 'ADMIN') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    };
  }

  return { authorized: true, user: authResult.user, session: authResult.session };
}
