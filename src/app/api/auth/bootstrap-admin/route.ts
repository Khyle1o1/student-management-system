import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hash } from 'bcryptjs'

// One-time, token-protected endpoint to create an admin user when locked out
// Protect with env token: ADMIN_BOOTSTRAP_TOKEN

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email)
}

export async function POST(request: Request) {
  const token = request.headers.get('x-bootstrap-token') || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.ADMIN_BOOTSTRAP_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '').trim()
  const name = String(body?.name || '').trim() || 'Administrator'

  if (!isValidEmail(email) || password.length < 6) {
    return NextResponse.json({ error: 'Invalid email or password too short' }, { status: 400 })
  }

  // Check if any admin exists already
  const { data: existingAdmins, error: adminsError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', 'ADMIN')
    .limit(1)

  if (adminsError) {
    return NextResponse.json({ error: 'Database error checking admins' }, { status: 500 })
  }

  // Allow creating another admin even if one exists, but caller controls usage
  // If you want strict first-admin-only, uncomment below
  // if (existingAdmins && existingAdmins.length > 0) {
  //   return NextResponse.json({ error: 'Admin already exists' }, { status: 409 })
  // }

  // Check if user email already exists
  const { data: existingUser, error: userCheckError } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()

  if (userCheckError) {
    return NextResponse.json({ error: 'Database error checking user' }, { status: 500 })
  }

  if (existingUser) {
    // If user exists, just promote and optionally reset password
    const updates: Record<string, any> = { role: 'ADMIN' }
    if (password) {
      updates.password = await hash(password, 12)
    }
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', existingUser.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to promote existing user' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, promotedExisting: true })
  }

  const hashed = await hash(password, 12)

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert([
      {
        email,
        name,
        role: 'ADMIN',
        password: hashed,
      },
    ])
    .select('id, email, role')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user: created })
}


