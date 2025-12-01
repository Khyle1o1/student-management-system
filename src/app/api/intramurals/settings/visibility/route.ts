import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// Public endpoint to check if intramurals content should be visible
export async function GET() {
  try {
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('intramurals_settings')
      .select('is_visible')
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      // Default to false if there's an error
      return NextResponse.json({ visible: false })
    }

    return NextResponse.json({ visible: settings?.is_visible || false })
  } catch (error) {
    console.error('Error in visibility API:', error)
    return NextResponse.json({ visible: false })
  }
}

