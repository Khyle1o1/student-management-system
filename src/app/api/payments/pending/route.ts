import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view pending payments
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'PENDING_APPROVAL' // PENDING_APPROVAL, APPROVED, REJECTED, or ALL
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query based on role
    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        student:students(
          id,
          student_id,
          name,
          email,
          college,
          course,
          year_level
        ),
        fee:fee_structures(
          id,
          name,
          amount,
          due_date,
          description,
          scope_type,
          scope_college,
          scope_course
        ),
        approver:users!payments_approved_by_fkey(
          id,
          name,
          email,
          role
        ),
        rejector:users!payments_rejected_by_fkey(
          id,
          name,
          email,
          role
        )
      `)
      .is('deleted_at', null)
      .not('receipt_url', 'is', null) // Only show payments with uploaded receipts

    // Filter by status
    if (status !== 'ALL') {
      query = query.eq('approval_status', status)
    }

    // Role-based filtering
    if (session.user.role === 'COLLEGE_ORG') {
      // College Org can only see payments for fees in their assigned college
      query = query.or(`fee.scope_type.eq.UNIVERSITY_WIDE,and(fee.scope_type.eq.COLLEGE_WIDE,fee.scope_college.eq."${session.user.assigned_college}"),and(fee.scope_type.eq.COURSE_SPECIFIC,fee.scope_college.eq."${session.user.assigned_college}")`)
    } else if (session.user.role === 'COURSE_ORG') {
      // Course Org can only see payments for fees in their assigned course
      query = query.or(`fee.scope_type.eq.UNIVERSITY_WIDE,and(fee.scope_type.eq.COURSE_SPECIFIC,fee.scope_college.eq."${session.user.assigned_college}",fee.scope_course.eq."${session.user.assigned_course}")`)
    }
    // ADMIN can see all payments (no filter)

    // Get total count
    const countQuery = supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('receipt_url', 'is', null) // Only count payments with uploaded receipts

    if (status !== 'ALL') {
      countQuery.eq('approval_status', status)
    }

    const { count } = await countQuery

    // Get paginated results
    const { data: payments, error } = await query
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching pending payments:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Filter out any payments without receipts (double-check)
    const paymentsWithReceipts = (payments || []).filter(
      (payment: any) => payment.receipt_url && payment.receipt_url.trim() !== ''
    )

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      payments: paymentsWithReceipts,
      pagination: {
        page,
        limit,
        total: paymentsWithReceipts.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    })

  } catch (error) {
    console.error('Error in GET /api/payments/pending:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

