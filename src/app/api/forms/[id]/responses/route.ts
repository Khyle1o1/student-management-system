import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth, getUserByEmail, getStudentByEmail } from "@/lib/auth"
import { z } from "zod"

// Helper function to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Schema for submitting a form response
const submitResponseSchema = z.object({
  answers: z.record(z.any()), // Object with question IDs as keys
  respondent_email: z.string().email().optional(),
  respondent_name: z.string().optional(),
  event_id: z.string().optional(), // For event evaluations
  student_id: z.string().optional(), // For event evaluations
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params first (Next.js 15+ requirement)
    const { id: formId } = await params
    
    console.log('\n========================================')
    console.log('📋 FORM RESPONSES REQUEST')
    console.log('========================================')
    
    const session = await auth()
    
    console.log('👤 SESSION INFO:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      role: session?.user?.role,
      studentId: session?.user?.studentId,
      student_id: session?.user?.student_id,
      fullSession: JSON.stringify(session?.user, null, 2)
    })
    
    if (!session) {
      console.log('❌ NO SESSION - Returning 401')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const studentId = searchParams.get('student_id')
    
    console.log('📝 REQUEST PARAMS:', {
      formId,
      studentId,
      page,
      limit
    })

    // Check if form exists
    const { data: form } = await supabaseAdmin
      .from('evaluation_forms')
      .select('created_by, title')
      .eq('id', formId)
      .single()

    if (!form) {
      console.log('❌ FORM NOT FOUND')
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }
    
    console.log('📄 FORM INFO:', {
      title: form.title,
      createdBy: form.created_by
    })

    // If student_id is provided, allow students to check their own responses
    if (studentId && session.user.role === 'USER') {
      console.log('\n🎓 STUDENT ACCESS CHECK')
      
      const sessionStudentId = session.user.studentId || session.user.student_id
      
      console.log('Requested student_id:', studentId)
      console.log('Session studentId:', session.user.studentId)
      console.log('Session student_id:', session.user.student_id)
      console.log('Computed sessionStudentId:', sessionStudentId)
      console.log('Match:', sessionStudentId === studentId)
      console.log('Types:', typeof sessionStudentId, typeof studentId)
      
      if (sessionStudentId === studentId) {
        console.log('✅ STUDENT ID MATCHES - Fetching student responses')
        // Get the student's internal UUID
        const { data: student } = await supabaseAdmin
          .from('students')
          .select('id')
          .eq('student_id', studentId)
          .single()

        if (student) {
          // Fetch only this student's responses
          const { data: responses, count, error } = await supabaseAdmin
            .from('form_responses')
            .select(`
              id,
              answers,
              respondent_email,
              respondent_name,
              submitted_at,
              student_id,
              event_id
            `, { count: 'exact' })
            .eq('form_id', formId)
            .eq('student_id', student.id)
            .order('submitted_at', { ascending: false })

          if (error) {
            console.error('Error fetching student responses:', error)
            return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
          }

          return NextResponse.json({
            responses: responses || [],
            total: count || 0,
          })
        } else {
          console.log('⚠️ Student record not found in database')
          return NextResponse.json({ 
            responses: [], 
            total: 0 
          })
        }
      } else {
        console.log('❌ STUDENT ID MISMATCH')
        console.log('  Expected:', sessionStudentId)
        console.log('  Got:', studentId)
        console.log('  Falling through to admin check...')
      }
    } else {
      console.log('ℹ️ Not a student request or not USER role:', {
        hasStudentId: !!studentId,
        role: session.user.role
      })
    }

    // For admin/creator viewing all responses
    console.log('\n🔐 ADMIN/CREATOR CHECK')
    console.log('User role:', session.user.role)
    console.log('Form creator:', form.created_by)
    console.log('User ID:', session.user.id)
    console.log('Is admin?', session.user.role === "ADMIN")
    console.log('Is Events Staff?', session.user.role === "EVENTS_STAFF")
    console.log('Is creator?', form.created_by === session.user.id)
    
    // ADMIN and EVENTS_STAFF can view any form responses, others only their own
    if (session.user.role !== "ADMIN" && session.user.role !== "EVENTS_STAFF" && form.created_by !== session.user.id) {
      console.log('❌ FORBIDDEN - Not admin/events staff and not creator')
      console.log('========================================\n')
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    console.log('✅ ACCESS GRANTED - Fetching all responses')

    // Fetch responses
    const { data: responses, count, error } = await supabaseAdmin
      .from('form_responses')
      .select(`
        id,
        answers,
        respondent_email,
        respondent_name,
        submitted_at,
        respondent:users!form_responses_respondent_id_fkey(
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('form_id', formId)
      .range(offset, offset + limit - 1)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching responses:', error)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    return NextResponse.json({
      responses: responses || [],
      total: count || 0,
      page,
      limit,
    })

  } catch (error) {
    console.error('Error in GET /api/forms/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params first (Next.js 15+ requirement)
    const { id: formId } = await params
    const body = await request.json()
    const data = submitResponseSchema.parse(body)

    // Get client IP and user agent
    const ip_address = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       null
    const user_agent = request.headers.get('user-agent') || null

    // Check if form exists and is published
    const { data: form } = await supabaseAdmin
      .from('evaluation_forms')
      .select('status, settings, closes_at, questions')
      .eq('id', formId)
      .single()

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Form is not accepting responses' }, { status: 400 })
    }

    // Check if form is closed
    if (form.closes_at && new Date(form.closes_at) < new Date()) {
      return NextResponse.json({ error: 'Form has closed' }, { status: 400 })
    }

    // Validate all required questions are answered
    const requiredQuestions = form.questions.filter((q: any) => q.required)
    const missingAnswers = requiredQuestions.filter(
      (q: any) => !data.answers[q.id] || 
      (Array.isArray(data.answers[q.id]) && data.answers[q.id].length === 0)
    )

    if (missingAnswers.length > 0) {
      return NextResponse.json({ 
        error: 'Please answer all required questions',
        missing: missingAnswers.map((q: any) => q.id)
      }, { status: 400 })
    }

    // Check authentication if required
    const session = await auth()
    const settings = form.settings || {}
    
    if (settings.require_login && !session) {
      return NextResponse.json({ error: 'Login required to submit this form' }, { status: 401 })
    }

    // Get the actual user UUID (for Google OAuth users, session.user.id is the OAuth ID, not UUID)
    let respondentUserId: string | null = null
    if (session?.user) {
      // Check if session.user.id is a valid UUID
      if (isValidUUID(session.user.id)) {
        // It's already a UUID, use it directly
        respondentUserId = session.user.id
      } else {
        // It's a Google OAuth ID, try to find the actual user UUID
        console.log('🔔 [FORM RESPONSES] Google OAuth user detected, looking up user UUID')
        
        // First, try to get user by email
        const dbUser = await getUserByEmail(session.user.email || '')
        if (dbUser) {
          respondentUserId = dbUser.id
          console.log('🔔 [FORM RESPONSES] Found user UUID from users table:', respondentUserId)
        } else {
          // If user not found, try to get user_id from student record
          console.log('🔔 [FORM RESPONSES] User not found, checking student record for user_id')
          const studentRecord = await getStudentByEmail(session.user.email || '')
          if (studentRecord?.user_id) {
            respondentUserId = studentRecord.user_id
            console.log('🔔 [FORM RESPONSES] Found user_id from student record:', respondentUserId)
          } else {
            console.log('🔔 [FORM RESPONSES] No user_id found, setting respondent_id to null')
          }
        }
      }
    }

    // Check for duplicate submissions if not allowed
    if (!settings.allow_multiple_submissions) {
      // For event evaluations, check by student_id if provided
      if (data.student_id) {
        const { count } = await supabaseAdmin
          .from('form_responses')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', formId)
          .eq('student_id', data.student_id)

        if (count && count > 0) {
          return NextResponse.json({ 
            error: 'You have already submitted a response to this form' 
          }, { status: 400 })
        }
      } else if (respondentUserId) {
        // For regular forms, check by respondent_id
        const { count } = await supabaseAdmin
          .from('form_responses')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', formId)
          .eq('respondent_id', respondentUserId)

        if (count && count > 0) {
          return NextResponse.json({ 
            error: 'You have already submitted a response to this form' 
          }, { status: 400 })
        }
      }
    }

    // Create response
    const responseData: any = {
      form_id: formId,
      answers: data.answers,
      respondent_id: respondentUserId,
      respondent_email: data.respondent_email || session?.user.email || null,
      respondent_name: data.respondent_name || session?.user.name || null,
      event_id: data.event_id || null, // For event evaluations
      student_id: data.student_id || null, // For event evaluations
      ip_address,
      user_agent,
    }

    const { data: response, error } = await supabaseAdmin
      .from('form_responses')
      .insert([responseData])
      .select()
      .single()

    if (error) {
      console.error('Error creating response:', error)
      console.error('Response data:', responseData)
      return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
    }
    
    console.log(`✅ Form response submitted: form=${formId}, event=${data.event_id || 'none'}, student=${data.student_id || 'none'}`)

    // If this is an event evaluation response, update certificate accessibility
    if (data.event_id && data.student_id) {
      console.log('🔔 [FORM RESPONSES] This is an event evaluation, updating certificate accessibility...')
      console.log('🔔 [FORM RESPONSES] Event ID:', data.event_id, 'Student ID:', data.student_id)
      
      try {
        // Find all certificates for this event and student
        // data.student_id should already be the student's internal UUID
        const { data: certificates, error: certError } = await supabaseAdmin
          .from('certificates')
          .select('id, is_accessible')
          .eq('event_id', data.event_id)
          .eq('student_id', data.student_id)

        if (!certError && certificates && certificates.length > 0) {
          console.log(`🔔 [FORM RESPONSES] Found ${certificates.length} certificate(s) to update`)
          
          // Update all certificates to be accessible
          const { error: updateError } = await supabaseAdmin
            .from('certificates')
            .update({ is_accessible: true })
            .eq('event_id', data.event_id)
            .eq('student_id', data.student_id)

          if (updateError) {
            console.error('🔔 [FORM RESPONSES] Error updating certificate accessibility:', updateError)
          } else {
            console.log(`🔔 [FORM RESPONSES] ✅ Updated ${certificates.length} certificate(s) to be accessible`)
          }
        } else {
          if (certError) {
            console.error('🔔 [FORM RESPONSES] Error finding certificates:', certError)
          } else {
            console.log('🔔 [FORM RESPONSES] No certificates found for this event and student')
          }
        }
      } catch (certError) {
        console.error('🔔 [FORM RESPONSES] Error updating certificates:', certError)
        // Don't fail the form submission if certificate update fails
      }
    }

    return NextResponse.json({ 
      success: true,
      response_id: response.id,
      message: settings.confirmation_message || 'Thank you for your response!'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/forms/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
