import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export interface SystemSettings {
  id: string
  deletion_lock: boolean
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
    // Fail closed: if we can't read settings, we treat deletion_lock as false
    return {
      id: "",
      deletion_lock: false,
    }
  }

  return {
    id: data.id,
    deletion_lock: !!data.deletion_lock,
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
 * Utility to invalidate the in-memory cache after settings are updated.
 */
export function invalidateSystemSettingsCache() {
  cachedSettings = null
  lastFetchedAt = null
}


