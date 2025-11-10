import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { generateCertificatesForEvent } from "@/lib/certificate-utils"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { event_id } = body

    if (!event_id) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to verify event' }, { status: 500 })
    }

    // Generate certificates for all eligible students
    const result = await generateCertificatesForEvent(event_id)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        results: result.results
      })
    } else {
      return NextResponse.json({
        error: result.error || 'Failed to generate certificates'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in POST /api/certificates/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 