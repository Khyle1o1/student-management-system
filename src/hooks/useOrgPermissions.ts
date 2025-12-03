"use client"

import { useSession } from "next-auth/react"
import { getOrgAccessLevelFromSession, hasOrgModuleAccess, type OrgAccessLevel, type OrgPermissionModule } from "@/lib/org-permissions"

export function useOrgPermissions() {
  const { data: session } = useSession()
  const level = getOrgAccessLevelFromSession(session as any)

  function canAccess(module: OrgPermissionModule) {
    return hasOrgModuleAccess(level, module)
  }

  return {
    orgAccessLevel: level,
    canAccess,
    isFinance: level === "finance",
    isEvent: level === "event",
    isCollegeOrgFull: level === "college",
  }
}


