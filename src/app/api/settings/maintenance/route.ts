import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  getSystemSettings,
  invalidateSystemSettingsCache,
} from "@/lib/system-settings"

export const dynamic = "force-dynamic"

/**
 * POST /api/settings/maintenance
 * Toggle maintenance mode (system_admin/ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Must be authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ONLY system admins (role = "ADMIN") can toggle maintenance mode
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only system administrators can toggle maintenance mode" },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { maintenance_mode } = body as { maintenance_mode?: boolean }

    // Validate input
    if (typeof maintenance_mode !== "boolean") {
      return NextResponse.json(
        { error: "maintenance_mode must be a boolean" },
        { status: 400 }
      )
    }

    // Get current settings to ensure row exists
    const existing = await getSystemSettings()
    const id = existing.id

    // Update maintenance mode in database
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .update({
        maintenance_mode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      console.error("Error updating maintenance mode:", error)
      return NextResponse.json(
        { error: "Failed to update maintenance mode" },
        { status: 500 }
      )
    }

    // Invalidate cache so changes take effect immediately
    invalidateSystemSettingsCache()

    return NextResponse.json({
      success: true,
      maintenance_mode: !!data.maintenance_mode,
      message: maintenance_mode 
        ? "Maintenance mode enabled" 
        : "Maintenance mode disabled"
    })
  } catch (error) {
    console.error("Error in POST /api/settings/maintenance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
