import { supabaseAdmin } from "@/lib/supabase-admin"
import type { Session } from "next-auth"

export type ActivityModule =
  | "events"
  | "fees"
  | "attendance"
  | "certificates"
  | "evaluations"
  | "users"
  | "permissions"
  | "settings"
  | "other"

export interface ActivityLogPayload {
  session: Session | null
  action: string
  module: ActivityModule | string
  targetType?: string
  targetId?: string | null
  targetName?: string | null
  college?: string | null
  course?: string | null
  details?: Record<string, any> | null
}

/**
 * Helper to record an activity log entry in the activity_logs table.
 * This centralizes audit logging and ensures consistent structure.
 */
export async function logActivity(payload: ActivityLogPayload) {
  try {
    const { session, action, module, targetType, targetId, targetName } = payload

    const role = session?.user?.role || "SYSTEM"
    const userId = session?.user?.id || null
    const userName =
      (session?.user?.name as string | null | undefined) ||
      (session?.user?.email as string | null | undefined) ||
      null

    const college =
      payload.college ??
      ((session?.user as any)?.assigned_college as string | null | undefined) ??
      null
    const course =
      payload.course ??
      ((session?.user as any)?.assigned_course as string | null | undefined) ??
      null

    const { error } = await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      user_name: userName,
      role,
      action,
      module,
      target_type: targetType || null,
      target_id: targetId || null,
      target_name: targetName || null,
      college,
      course,
      details: payload.details ?? null,
    })

    if (error) {
      console.error("[activity-logger] Failed to insert activity log:", error)
    }
  } catch (error) {
    console.error("[activity-logger] Unexpected error while logging activity:", error)
  }
}


