import type { Session } from "next-auth"

// Sub-role for COLLEGE_ORG accounts
export type OrgAccessLevel = "finance" | "event" | "college"

// Permission map for college organization access levels
export const ORG_PERMISSIONS = {
  finance: {
    students: { view: true, markPaid: true },
    fees: { view: true, download: true, create: false, edit: false, delete: false },
    events: { access: false, attendance: false, create: false },
    certificates: { access: false },
    evaluations: { access: false },
    intramurals: false,
    reports: true,
    settings: false,
  },
  event: {
    students: { view: false, markPaid: false },
    fees: { view: false, download: false, create: false, edit: false, delete: false },
    events: { access: true, attendance: true, downloadReport: true, create: true },
    certificates: { access: true, create: true, edit: true, delete: true },
    evaluations: { access: true, create: true, edit: true, delete: true },
    intramurals: false,
    reports: false,
    settings: false,
  },
  college: {
    students: { view: true, markPaid: true },
    fees: { view: true, download: true, create: true, edit: true, delete: true },
    events: { access: true, attendance: true, create: true, edit: true },
    certificates: { access: true, create: true, edit: true, delete: true },
    evaluations: { access: true, create: true, edit: true, delete: true },
    intramurals: true,
    reports: true,
    settings: true,
  },
} as const

export type OrgPermissionModule =
  | "students"
  | "fees"
  | "events"
  | "certificates"
  | "evaluations"
  | "intramurals"
  | "reports"
  | "settings"

/**
 * Resolve the effective org access level for a session.
 * - Only applies to COLLEGE_ORG accounts
 * - Defaults to "college" (full org access) when not set
 */
export function getOrgAccessLevelFromSession(
  session: Session | null
): OrgAccessLevel | null {
  if (!session?.user) return null
  if (session.user.role !== "COLLEGE_ORG") return null

  const raw = (session.user as any).org_access_level as OrgAccessLevel | null | undefined

  if (raw === "finance" || raw === "event" || raw === "college") {
    return raw
  }

  // Backwards compatible default: full college access
  return "college"
}

/**
 * Check if the current org access level has permission for a module / action.
 * This is intentionally simple; callers can inspect the returned object
 * for finer-grained checks (e.g. create/edit/delete).
 */
export function hasOrgModuleAccess(
  level: OrgAccessLevel | null,
  module: OrgPermissionModule
): boolean {
  if (!level) return false
  const perms = ORG_PERMISSIONS[level]
  const mod = (perms as any)[module]

  if (mod === undefined) return false
  if (typeof mod === "boolean") return mod

  // Object => consider it accessible if any flag is true
  return Object.values(mod).some(Boolean)
}

/**
 * Simple backend helper to enforce specific org access levels.
 * Example: requireOrgRole(session, ["finance"]) in route handlers.
 */
export function requireOrgRole(
  session: Session | null,
  allowed: OrgAccessLevel[]
): { ok: boolean; level: OrgAccessLevel | null } {
  const level = getOrgAccessLevelFromSession(session)
  if (!level) return { ok: false, level }
  return { ok: allowed.includes(level), level }
}


