import { NextResponse } from "next/server"
import { getSystemSettings } from "@/lib/system-settings"

export const dynamic = "force-dynamic"

/**
 * GET /api/settings
 * Public endpoint to check system settings (especially maintenance mode)
 * Accessible to all users (authenticated or not)
 */
export async function GET() {
  try {
    const settings = await getSystemSettings()
    
    // Return only public-facing settings
    return NextResponse.json({
      maintenance_mode: settings.maintenance_mode,
      deletion_lock: settings.deletion_lock,
    })
  } catch (error) {
    console.error("Error in GET /api/settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
