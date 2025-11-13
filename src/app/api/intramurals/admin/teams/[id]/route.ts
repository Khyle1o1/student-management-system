import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// PUT - Update a team
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await context.params

    const body = await request.json()
    const { name, logo, color } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('intramurals_teams')
      .update({
        name: name.trim(),
        logo: logo || null,
        color: color || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating team:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Team name already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      )
    }

    return NextResponse.json({ team: data })
  } catch (error) {
    console.error('Error in update team API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a team
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await context.params

    const { error } = await supabaseAdmin
      .from('intramurals_teams')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting team:', error)
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete team API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

