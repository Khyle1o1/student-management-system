import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  getSystemSettings,
  invalidateSystemSettingsCache,
} from "@/lib/system-settings"

export const dynamic = "force-dynamic"

// GET - Fetch global system settings
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await getSystemSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error in GET /api/system-settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update global system settings
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { deletion_lock, password } = body as { deletion_lock?: boolean; password?: string }

    if (typeof deletion_lock !== "boolean") {
      return NextResponse.json(
        { error: "deletion_lock must be a boolean" },
        { status: 400 }
      )
    }

    // Ensure a settings row exists and get its ID
    const existing = await getSystemSettings()
    const id = existing.id

    // When turning OFF deletion lock, require master password verification
    if (existing.deletion_lock && deletion_lock === false) {
      if (!password || typeof password !== "string") {
        return NextResponse.json(
          { error: "Password is required to disable Deletion Lock Mode." },
          { status: 400 }
        )
      }

      // Simple string check – master password is: AOG CREATIVES2025
      const MASTER_PASSWORD = "AOGCREATIVES2025"
      if (password !== MASTER_PASSWORD) {
        return NextResponse.json(
          { error: "Invalid password. Deletion Lock Mode remains enabled." },
          { status: 401 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .update({
        deletion_lock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      console.error("Error updating system settings:", error)
      return NextResponse.json(
        { error: "Failed to update system settings" },
        { status: 500 }
      )
    }

    invalidateSystemSettingsCache()

    return NextResponse.json({
      settings: {
        id: data.id,
        deletion_lock: !!data.deletion_lock,
      },
    })
  } catch (error) {
    console.error("Error in PUT /api/system-settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


