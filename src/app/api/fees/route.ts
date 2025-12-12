import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { feeSchema } from "@/lib/validations"
import { z } from "zod"
import { getOrgAccessLevelFromSession } from "@/lib/org-permissions"
import { logActivity } from "@/lib/activity-logger"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const role = session.user.role
    const isAdmin = role === 'ADMIN'
    const isCollegeOrg = role === 'COLLEGE_ORG'
    const isCourseOrg = role === 'COURSE_ORG'

    // Event-level college accounts cannot access Fees at all
    const orgAccessLevel = getOrgAccessLevelFromSession(session as any)
    if (isCollegeOrg && orgAccessLevel === "event") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!(isAdmin || isCollegeOrg || isCourseOrg)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // Build query for search
    let query = supabaseAdmin
      .from('fee_structures')
      .select('*')

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,type.ilike.%${search}%,school_year.ilike.%${search}%`)
    }

    // Get total count for pagination (respect scope and active visibility)
    let countBuilder = supabaseAdmin
      .from('fee_structures')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (search) {
      countBuilder = countBuilder.or(`name.ilike.%${search}%,description.ilike.%${search}%,type.ilike.%${search}%,school_year.ilike.%${search}%`)
    }
    if (isCollegeOrg) {
      countBuilder = countBuilder.or(
        `and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${session.user.assigned_college}),and(scope_type.eq.COURSE_SPECIFIC,scope_college.eq.${session.user.assigned_college})`
      )
    } else if (isCourseOrg) {
      const course = session.user.assigned_course || ''
      countBuilder = countBuilder
        .eq('scope_type', 'COURSE_SPECIFIC')
        .eq('scope_college', session.user.assigned_college || '')
        .eq('scope_course', course)
    } else {
      // Admin only counts active
      countBuilder = countBuilder.eq('is_active', true)
    }

    const { count } = await countBuilder

    // Scope filtering for org roles
    if (isCollegeOrg) {
      query = query.or(
        `and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${session.user.assigned_college}),and(scope_type.eq.COURSE_SPECIFIC,scope_college.eq.${session.user.assigned_college})`
      )
    } else if (isCourseOrg) {
      const course = session.user.assigned_course || ''
      query = query
        .eq('scope_type', 'COURSE_SPECIFIC')
        .eq('scope_college', session.user.assigned_college || '')
        .eq('scope_course', course)
    }

    // Get paginated fees
    // Admin sees both active and pending; orgs see active + pending by scope

    const { data: fees, error } = await query
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching fees:', error)
      return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
    }

    // Transform the data to match frontend expectations
    const transformedFees = fees?.map((fee: any) => ({
      id: fee.id,
      name: fee.name,
      type: fee.type?.toLowerCase().replace('_', ' ') || 'other',
      amount: fee.amount,
      description: fee.description || "",
      dueDate: fee.due_date ? new Date(fee.due_date).toISOString().split('T')[0] : "",
      semester: fee.semester || "",
      schoolYear: fee.school_year || "",
      scope_type: fee.scope_type || "UNIVERSITY_WIDE",
      scope_college: fee.scope_college || "",
      scope_course: fee.scope_course || "",
      status: fee.is_active ? 'ACTIVE' : 'PENDING',
      createdAt: fee.created_at,
    })) || []

    return NextResponse.json({
      fees: transformedFees,
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/fees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow ADMIN plus org accounts with sufficient access level to create
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const orgAccessLevel = getOrgAccessLevelFromSession(session as any)

    const body = await request.json()
    console.log("Received fee data:", body)

    // Validate the data
    const validatedData = feeSchema.parse(body)

    // Role-scoped constraints and pending approval behavior
    const isAdmin = session.user.role === 'ADMIN'
    const isCollegeOrg = session.user.role === 'COLLEGE_ORG'
    const isCourseOrg = session.user.role === 'COURSE_ORG'

    // Finance accounts can view fees but cannot create them
    if (isCollegeOrg && orgAccessLevel === "finance") {
      return NextResponse.json({ error: 'Forbidden: Finance accounts cannot create fees' }, { status: 403 })
    }

    // Enforce scope for org users
    if ((isCollegeOrg || isCourseOrg)) {
      // College must match
      if (validatedData.scope_college !== session.user.assigned_college) {
        return NextResponse.json({ error: 'Scope college must match your assigned college' }, { status: 403 })
      }
      // Course Org can only create COURSE_SPECIFIC for their course(s)
      if (isCourseOrg) {
        if (validatedData.scope_type !== 'COURSE_SPECIFIC') {
          return NextResponse.json({ error: 'Course Organization can only create course-specific fees' }, { status: 403 })
        }
        const assignedCourses: string[] = (session.user as any).assigned_courses || (session.user.assigned_course ? [session.user.assigned_course] : [])
        if (!validatedData.scope_course || !assignedCourses.includes(validatedData.scope_course)) {
          return NextResponse.json({ error: 'Scope course must be one of your assigned courses' }, { status: 403 })
        }
      }
    }

    // Create the fee structure
    const { data: fee, error } = await supabaseAdmin
      .from('fee_structures')
      .insert([{
        name: validatedData.name,
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description || null,
        due_date: validatedData.dueDate ? validatedData.dueDate : null,
        semester: validatedData.semester || null,
        school_year: validatedData.schoolYear,
        scope_type: validatedData.scope_type,
        scope_college: validatedData.scope_college || null,
        scope_course: validatedData.scope_course || null,
        // Store exempted students as an array of IDs/UUIDs
        exempted_students: validatedData.exempted_students || [],
        // Admin-created fees go live immediately; org-created require approval (inactive)
        is_active: isAdmin,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating fee:', error)
      return NextResponse.json({ error: 'Failed to create fee' }, { status: 500 })
    }

    console.log("Created fee:", fee)

    // If created by org, log a pending approval notification for admins
    if (!isAdmin) {
      const actor = session.user
      // Existing notification for admins
      await supabaseAdmin.from('notifications').insert({
        user_id: actor.id,
        type: 'SYSTEM_ACTIVITY',
        title: 'Fee awaiting approval',
        message: `${actor.role} ${actor.name || ''} created a fee ("${(fee as any)?.name}") pending admin approval`,
        data: {
          action: 'FEE_CREATED_PENDING',
          fee_id: (fee as any)?.id,
          scope_type: (fee as any)?.scope_type,
          scope_college: (fee as any)?.scope_college,
          scope_course: (fee as any)?.scope_course,
        },
        is_read: true,
        created_at: new Date().toISOString(),
      })

      // Mirror to activity_logs for timeline
      await logActivity({
        session,
        action: "FEE_CREATED_PENDING",
        module: "fees",
        targetType: "fee",
        targetId: (fee as any)?.id,
        targetName: (fee as any)?.name,
        college: (fee as any)?.scope_college,
        course: (fee as any)?.scope_course,
        details: {
          status: (fee as any)?.is_active ? "ACTIVE" : "PENDING",
          scope_type: (fee as any)?.scope_type,
        },
      })
    }

    // OPTIMIZATION: Use PostgreSQL function instead of looping in JavaScript
    // This moves all the student filtering and payment insertion to the database
    const { data: assignResult, error: assignError } = await supabaseAdmin
      .rpc('assign_fee_to_students', {
        p_fee_id: fee.id,
        p_amount: validatedData.amount,
        p_scope_type: validatedData.scope_type,
        p_scope_college: validatedData.scope_college || null,
        p_scope_course: validatedData.scope_course || null,
        p_exempted_student_ids: validatedData.exempted_students || []
      })

    if (assignError) {
      console.error('Error assigning fee to students:', assignError)
      // Don't fail fee creation if student assignment fails
    } else if (assignResult && assignResult.length > 0) {
      console.log(`✅ Assigned fee to ${assignResult[0].total_assigned} students in ${assignResult[0].execution_time_ms}ms`)
    }

    return NextResponse.json({
      ...fee,
      assignedStudents: assignResult?.[0]?.total_assigned || 0
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/fees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 