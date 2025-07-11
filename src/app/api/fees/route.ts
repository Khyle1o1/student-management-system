import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { feeSchema } from "@/lib/validations"
import { z } from "zod"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // Build query for search
    let query = supabase
      .from('fee_structures')
      .select('*')

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,type.ilike.%${search}%,school_year.ilike.%${search}%`)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('fee_structures')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('deleted_at', null)

    // Get paginated fees
    const { data: fees, error } = await query
      .eq('is_active', true)
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    console.log("Received fee data:", body)

    // Validate the data
    const validatedData = feeSchema.parse(body)

    // Create the fee structure
    const { data: fee, error } = await supabase
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
        is_active: true,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating fee:', error)
      return NextResponse.json({ error: 'Failed to create fee' }, { status: 500 })
    }

    console.log("Created fee:", fee)

    return NextResponse.json(fee, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/fees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 