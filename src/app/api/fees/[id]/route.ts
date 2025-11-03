import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { feeSchema } from "@/lib/validations"
import { z } from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const { data: fee, error } = await supabaseAdmin
      .from('fee_structures')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Fee not found" }, { status: 404 })
      }
      console.error("Error fetching fee:", error)
      return NextResponse.json({ error: "Failed to fetch fee" }, { status: 500 })
    }

    // Transform the data to match frontend expectations
    const transformedFee = {
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
      createdAt: fee.created_at,
    }

    return NextResponse.json(transformedFee)
  } catch (error) {
    console.error("Error fetching fee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = feeSchema.parse(body)

    const { id } = await params
    const { data: updatedFee, error } = await supabaseAdmin
      .from('fee_structures')
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      console.error("Error updating fee:", error)
      return NextResponse.json(
        { error: "Failed to update fee" },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedFee)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating fee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    
    // First, delete all associated payment records
    const { error: paymentsError } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('fee_id', id)

    if (paymentsError) {
      console.error("Error deleting payment records:", paymentsError)
      // Continue anyway - we still want to delete the fee
    }

    // Then soft delete the fee by setting deleted_at timestamp and is_active to false
    const { error } = await supabaseAdmin
      .from('fee_structures')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)

    if (error) {
      console.error("Error deleting fee:", error)
      return NextResponse.json(
        { error: "Failed to delete fee" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Fee deleted successfully" })
  } catch (error) {
    console.error("Error deleting fee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 