import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow ADMIN and organization users to view reports
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Ensure fee exists (and fetch amount for potential aggregation/reference)
    const { data: fee, error: feeError } = await supabaseAdmin
      .from('fee_structures')
      .select('id, amount')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (feeError || !fee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 })
    }

    // Aggregate payments that are marked PAID for this fee
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('student_id, amount, status')
      .eq('fee_id', id)
      .eq('status', 'PAID')
      .is('deleted_at', null)

    if (paymentsError) {
      console.error('Error fetching payments for report:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const uniqueStudentIds = new Set<string>()
    let totalPaid = 0
    for (const p of payments || []) {
      if (p.student_id) uniqueStudentIds.add(p.student_id as unknown as string)
      totalPaid += Number(p.amount || 0)
    }

    return NextResponse.json({
      feeId: id,
      paidStudentCount: uniqueStudentIds.size,
      totalPaid,
    })
  } catch (error) {
    console.error('Error in GET /api/fees/[id]/report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


