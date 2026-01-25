import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - Fetch settings
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and INTRAMURALS_STAFF can access intramurals settings
    if (session.user.role !== 'ADMIN' && session.user.role !== 'INTRAMURALS_STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('intramurals_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('Error in settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update settings
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and INTRAMURALS_STAFF can update intramurals settings
    if (session.user.role !== 'ADMIN' && session.user.role !== 'INTRAMURALS_STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { is_visible } = body

    if (typeof is_visible !== 'boolean') {
      return NextResponse.json(
        { error: 'is_visible must be a boolean' },
        { status: 400 }
      )
    }

    // First, get the settings row to get its ID
    const { data: existingSettings, error: fetchError } = await supabaseAdmin
      .from('intramurals_settings')
      .select('id')
      .single()

    if (fetchError || !existingSettings) {
      console.error('Error fetching settings for update:', fetchError)
      return NextResponse.json(
        { error: 'Settings not found. Please run the database migration.' },
        { status: 404 }
      )
    }

    // Now update by ID
    const { data, error } = await supabaseAdmin
      .from('intramurals_settings')
      .update({
        is_visible,
        last_updated: new Date().toISOString(),
      })
      .eq('id', existingSettings.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('Error in update settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

