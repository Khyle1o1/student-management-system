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

    const role = session.user.role
    const isAdmin = role === "ADMIN"
    const isCollegeOrg = role === "COLLEGE_ORG"
    const isCourseOrg = role === "COURSE_ORG"

    if (!(isAdmin || isCollegeOrg || isCourseOrg)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = request.nextUrl

    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = (page - 1) * limit

    const userId = searchParams.get("userId") || undefined
    const user = searchParams.get("user") || undefined
    const action = searchParams.get("action") || undefined
    const moduleFilter = searchParams.get("module") || undefined
    const collegeFilter = searchParams.get("college") || undefined
    const courseFilter = searchParams.get("course") || undefined
    const search = searchParams.get("search") || undefined
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined

    let baseQuery = supabaseAdmin
      .from("activity_logs")
      .select("*", { count: "exact" })

    // Role-based scoping
    if (isCollegeOrg) {
      const assignedCollege = (session.user as any).assigned_college || null
      if (!assignedCollege) {
        return NextResponse.json(
          { error: "College organization account is missing assigned_college" },
          { status: 400 }
        )
      }
      baseQuery = baseQuery.eq("college", assignedCollege)
    } else if (isCourseOrg) {
      const assignedCourse = (session.user as any).assigned_course || null
      if (!assignedCourse) {
        return NextResponse.json(
          { error: "Course organization account is missing assigned_course" },
          { status: 400 }
        )
      }
      baseQuery = baseQuery.eq("course", assignedCourse)
    }

    // Additional filters (only further restrict, never widen)
    if (userId) {
      baseQuery = baseQuery.eq("user_id", userId)
    }

    if (user) {
      // Filter by user name (case-insensitive). If an exact UUID is passed we also match user_id.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user)
      if (isUuid) {
        baseQuery = baseQuery.or(
          `user_id.eq.${user},user_name.ilike.%${user}%`
        )
      } else {
        baseQuery = baseQuery.ilike("user_name", `%${user}%`)
      }
    }

    if (action) {
      baseQuery = baseQuery.eq("action", action)
    }

    if (moduleFilter) {
      baseQuery = baseQuery.eq("module", moduleFilter)
    }

    if (collegeFilter) {
      baseQuery = baseQuery.eq("college", collegeFilter)
    }

    if (courseFilter) {
      baseQuery = baseQuery.eq("course", courseFilter)
    }

    if (search) {
      baseQuery = baseQuery.or(
        `user_name.ilike.%${search}%,target_name.ilike.%${search}%,target_type.ilike.%${search}%`
      )
    }

    if (startDate) {
      baseQuery = baseQuery.gte("created_at", new Date(startDate).toISOString())
    }

    if (endDate) {
      // include the whole end day by going to end-of-day
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      baseQuery = baseQuery.lte("created_at", end.toISOString())
    }

    // Apply pagination & ordering (newest first)
    const { data, error, count } = await baseQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[activity-logs] Failed to fetch logs:", error)
      return NextResponse.json(
        { error: "Failed to fetch activity logs" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      logs: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (error) {
    console.error("[activity-logs] Unexpected error in GET:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    )
  }
}


