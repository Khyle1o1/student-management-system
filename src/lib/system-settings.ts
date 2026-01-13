import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export interface SystemSettings {
  id: string
  deletion_lock: boolean
  maintenance_mode: boolean
}

let cachedSettings: SystemSettings | null = null
let lastFetchedAt: number | null = null
const CACHE_TTL_MS = 30_000 // 30 seconds is enough for dashboard usage

async function fetchSystemSettingsFromDb(): Promise<SystemSettings> {
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .limit(1)
    .single()

  if (error || !data) {
    console.error("Failed to load system settings:", error)
    // Fail closed: if we can't read settings, we treat deletion_lock and maintenance_mode as false
    return {
      id: "",
      deletion_lock: false,
      maintenance_mode: false,
    }
  }

  return {
    id: data.id,
    deletion_lock: !!data.deletion_lock,
    maintenance_mode: !!data.maintenance_mode,
  }
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now()

  if (cachedSettings && lastFetchedAt && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedSettings
  }

  const settings = await fetchSystemSettingsFromDb()
  cachedSettings = settings
  lastFetchedAt = now
  return settings
}

export async function isDeletionLocked(): Promise<boolean> {
  const settings = await getSystemSettings()
  return !!settings.deletion_lock
}

export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getSystemSettings()
  return !!settings.maintenance_mode
}

/**
 * Guard helper for delete endpoints.
 * Call this at the top of any DELETE handler and early-return if it yields a response.
 */
export async function ensureDeletionNotLocked() {
  const locked = await isDeletionLocked()

  if (locked) {
    return NextResponse.json(
      { error: "Deletion is locked by system settings." },
      { status: 423 } // 423 Locked
    )
  }

  return null
}

/**
 * Guard helper for maintenance mode.
 * Call this at the top of any API handler to block non-admin users during maintenance.
 * Returns null if access is allowed, or a NextResponse to return to the client.
 */
export async function ensureMaintenanceAccess(userRole: string | undefined) {
  const maintenanceMode = await isMaintenanceMode()

  if (maintenanceMode && userRole !== "ADMIN") {
    return NextResponse.json(
      { 
        status: "maintenance",
        message: "System is under maintenance. Please try again later." 
      },
      { status: 503 } // 503 Service Unavailable
    )
  }

  return null
}

/**
 * Utility to invalidate the in-memory cache after settings are updated.
 */
export function invalidateSystemSettingsCache() {
  cachedSettings = null
  lastFetchedAt = null
}


