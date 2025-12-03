import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Restrict to admin-like roles
    if (!["ADMIN", "COLLEGE_ORG", "COURSE_ORG"].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const idsParam = searchParams.get("ids")
    if (!idsParam) {
      return NextResponse.json({ students: [] })
    }

    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ students: [] })
    }

    const { data, error } = await supabaseAdmin
      .from("students")
      .select("id, student_id, name, email")
      .in("id", ids)

    if (error) {
      console.error("Error fetching students by ids:", error)
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      )
    }

    return NextResponse.json({ students: data || [] })
  } catch (error) {
    console.error("Unexpected error in GET /api/students/by-ids:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}


