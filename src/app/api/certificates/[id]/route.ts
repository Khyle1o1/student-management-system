import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'view' or 'download'

    // Get certificate with related data
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        *,
        event:events(
          id,
          title,
          date,
          location,
          require_evaluation
        ),
        student:students(
          id,
          student_id,
          name,
          email,
          college,
          course
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
      }
      console.error('Error fetching certificate:', error)
      return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 })
    }

    // Check access permissions
    if (session.user.role === 'STUDENT') {
      // Students can only access their own certificates
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (studentError || !studentRecord || studentRecord.id !== certificate.student_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Check if certificate is accessible (evaluation completed if required)
      if (!certificate.is_accessible) {
        return NextResponse.json({ 
          error: 'Certificate not yet accessible. Please complete the event evaluation first.',
          requires_evaluation: true
        }, { status: 403 })
      }
    }

    // Log access if this is a view or download action
    if (action === 'view' || action === 'download') {
      const headersList = headers()
      const userAgent = headersList.get('user-agent') || null
      const forwarded = headersList.get('x-forwarded-for')
      const realIP = headersList.get('x-real-ip')
      const ipAddress = forwarded ? forwarded.split(',')[0] : realIP

      // Get student ID for access log
      let logStudentId = null
      if (session.user.role === 'STUDENT') {
        const { data: studentRecord } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', session.user.id)
          .single()
        logStudentId = studentRecord?.id || null
      }

      const { error: logError } = await supabase
        .from('certificate_access_log')
        .insert([{
          certificate_id: id,
          student_id: logStudentId,
          access_type: action.toUpperCase(),
          ip_address: ipAddress,
          user_agent: userAgent
        }])

      if (logError) {
        console.error('Error logging certificate access:', logError)
        // Don't fail the request for logging errors
      }
    }

    // Return certificate data
    return NextResponse.json({
      ...certificate,
      access_granted: true
    })

  } catch (error) {
    console.error('Error in GET /api/certificates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()

    // Only allow updating accessibility status for now
    const updateData: any = {}
    if (body.is_accessible !== undefined) {
      updateData.is_accessible = body.is_accessible
    }
    if (body.file_path !== undefined) {
      updateData.file_path = body.file_path
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: certificate, error } = await supabase
      .from('certificates')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        event:events(
          id,
          title,
          date
        ),
        student:students(
          id,
          student_id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
      }
      console.error('Error updating certificate:', error)
      return NextResponse.json({ error: 'Failed to update certificate' }, { status: 500 })
    }

    return NextResponse.json(certificate)

  } catch (error) {
    console.error('Error in PATCH /api/certificates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = params

    // Check if certificate exists
    const { data: certificate, error: fetchError } = await supabase
      .from('certificates')
      .select('id, student_id, event_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
      }
      console.error('Error fetching certificate:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 })
    }

    // Delete access logs first (due to foreign key constraint)
    const { error: accessLogError } = await supabase
      .from('certificate_access_log')
      .delete()
      .eq('certificate_id', id)

    if (accessLogError) {
      console.error('Error deleting access logs:', accessLogError)
      return NextResponse.json({ error: 'Failed to delete certificate access logs' }, { status: 500 })
    }

    // Delete the certificate
    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting certificate:', error)
      return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 })
    }

    // Update attendance record to mark certificate as not generated
    const { error: updateError } = await supabase
      .from('attendance')
      .update({ certificate_generated: false })
      .eq('event_id', certificate.event_id)
      .eq('student_id', certificate.student_id)

    if (updateError) {
      console.error('Error updating attendance record:', updateError)
      // Don't fail deletion for this
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/certificates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 