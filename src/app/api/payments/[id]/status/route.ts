import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateStatusSchema = z.object({
  status: z.enum(['PAID', 'UNPAID', 'PENDING', 'OVERDUE'])
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    // Update payment status
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .update({
        status,
        payment_date: status === 'PAID' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment status:', error)
      return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      payment,
      message: 'Payment status updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in PATCH /api/payments/[id]/status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

