import { NextRequest, NextResponse } from "next/server"
import { auth, hashPassword, verifyPassword } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"

const allowedRoles = ["ADMIN", "COLLEGE_ORG", "COURSE_ORG"] as const

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long").optional(),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one number"),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Passwords do not match",
  })

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!allowedRoles.includes(session.user.role as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, email, name, role, assigned_college, assigned_course, assigned_courses, org_access_level"
    )
    .eq("id", session.user.id)
    .is("deleted_at", null)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { data: lastPasswordLog } = await supabaseAdmin
    .from("activity_logs")
    .select("created_at")
    .eq("user_id", session.user.id)
    .eq("action", "User updated their password")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    assigned_college: user.assigned_college,
    assigned_course: user.assigned_course,
    assigned_courses: user.assigned_courses,
    org_access_level: user.org_access_level,
    last_password_change_at: lastPasswordLog?.created_at ?? null,
    profile_photo_url: null,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!allowedRoles.includes(session.user.role as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const result = updateProfileSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: result.error.flatten().fieldErrors,
      },
      { status: 422 }
    )
  }

  const updateData: Record<string, any> = {}
  if (result.data.name !== undefined) {
    updateData.name = result.data.name.trim()
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    )
  }

  const { data: updatedUser, error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", session.user.id)
    .is("deleted_at", null)
    .select("id, email, name, role, assigned_college, assigned_course, assigned_courses, org_access_level")
    .single()

  if (error || !updatedUser) {
    console.error("Failed to update profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }

  await logActivity({
    session,
    action: "User updated their profile info",
    module: "users",
    targetType: "user",
    targetId: updatedUser.id,
    targetName: updatedUser.name,
    details: {
      fields_updated: Object.keys(updateData),
    },
  })

  return NextResponse.json({
    message: "Profile updated successfully",
    user: updatedUser,
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!allowedRoles.includes(session.user.role as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const result = changePasswordSchema.safeParse(body)

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    return NextResponse.json(
      {
        error: "Validation error",
        details: fieldErrors,
      },
      { status: 422 }
    )
  }

  const { currentPassword, newPassword } = result.data

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, password")
    .eq("id", session.user.id)
    .is("deleted_at", null)
    .single()

  if (userError || !user) {
    console.error("Failed to load user for password change:", userError)
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    )
  }

  const passwordMatch = await verifyPassword(
    currentPassword,
    (user as any).password as string
  )

  if (!passwordMatch) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    )
  }

  const newHashedPassword = await hashPassword(newPassword)

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      password: newHashedPassword,
    })
    .eq("id", session.user.id)

  if (updateError) {
    console.error("Failed to update password:", updateError)
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    )
  }

  await logActivity({
    session,
    action: "User updated their password",
    module: "users",
    targetType: "user",
    targetId: session.user.id,
    targetName: session.user.name ?? session.user.email,
    details: {
      password_changed: true,
    },
  })

  return NextResponse.json({
    message: "Password updated successfully",
  })
}


