import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - Fetch announcement settings
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'INTRAMURALS_STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('intramurals_settings')
      .select('auto_announcements_enabled, announcement_approval_required')
      .single()

    if (error) {
      console.error('Error fetching announcement settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      auto_announcements_enabled: data?.auto_announcements_enabled ?? true,
      announcement_approval_required: data?.announcement_approval_required ?? false
    })
  } catch (error) {
    console.error('Error in get announcement settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update announcement settings
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { auto_announcements_enabled, announcement_approval_required } = body

    const updateData: any = {}
    if (typeof auto_announcements_enabled === 'boolean') {
      updateData.auto_announcements_enabled = auto_announcements_enabled
    }
    if (typeof announcement_approval_required === 'boolean') {
      updateData.announcement_approval_required = announcement_approval_required
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid settings provided' },
        { status: 400 }
      )
    }

    // Get the first (and should be only) settings record
    const { data: existingSettings } = await supabaseAdmin
      .from('intramurals_settings')
      .select('id')
      .single()

    let result
    if (existingSettings) {
      // Update existing settings
      result = await supabaseAdmin
        .from('intramurals_settings')
        .update(updateData)
        .eq('id', existingSettings.id)
        .select()
        .single()
    } else {
      // Create new settings record if none exists
      result = await supabaseAdmin
        .from('intramurals_settings')
        .insert({
          ...updateData,
          is_visible: true // default value for the main visibility setting
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error updating announcement settings:', result.error)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      settings: result.data,
      message: 'Announcement settings updated successfully'
    })
  } catch (error) {
    console.error('Error in update announcement settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
