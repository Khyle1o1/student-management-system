import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

// GET - Fetch all teams
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('intramurals_teams')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    return NextResponse.json({ teams: data || [] })
  } catch (error) {
    console.error('Error in teams API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new team
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
      .insert({
        name: name.trim(),
        logo: logo || null,
        color: color || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating team:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Team name already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      )
    }

    return NextResponse.json({ team: data })
  } catch (error) {
    console.error('Error in create team API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

