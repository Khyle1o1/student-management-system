import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { certificateId } = await request.json()

    if (!certificateId) {
      return NextResponse.json({ error: "Certificate ID is required" }, { status: 400 })
    }

    // Get certificate with event details
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select(`
        *,
        event:events(
          id,
          title,
          require_evaluation
        )
      `)
      .eq('id', certificateId)
      .single()

    if (certError || !certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
    }

    // Check if event requires evaluation
    if (!certificate.event.require_evaluation) {
      // If no evaluation required, certificate should be accessible
      const { error: updateError } = await supabase
        .from('certificates')
        .update({ is_accessible: true })
        .eq('id', certificateId)

      if (updateError) {
        return NextResponse.json({ error: "Failed to update certificate" }, { status: 500 })
      }

      return NextResponse.json({ 
        message: "Certificate updated - no evaluation required",
        is_accessible: true 
      })
    }

    // Check if student has completed evaluation
    const { data: evalResponse, error: evalError } = await supabase
      .from('student_evaluation_responses')
      .select('id')
      .eq('event_id', certificate.event_id)
      .eq('student_id', certificate.student_id)
      .single()

    const isAccessible = !!evalResponse

    // Update certificate accessibility
    const { error: updateError } = await supabase
      .from('certificates')
      .update({ is_accessible: isAccessible })
      .eq('id', certificateId)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update certificate" }, { status: 500 })
    }

    return NextResponse.json({ 
      message: isAccessible 
        ? "Certificate updated - evaluation completed" 
        : "Certificate updated - evaluation still required",
      is_accessible: isAccessible,
      evaluation_completed: !!evalResponse
    })

  } catch (error) {
    console.error('Error updating certificate accessibility:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 