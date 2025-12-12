import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

function isAdmin(role?: string | null) {
  return role === "ADMIN"
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgIdFilter = searchParams.get("orgId")
    const purpose = searchParams.get("purpose")
    const userType = searchParams.get("userType")
    const reaction = searchParams.get("reactionType")
    const status = searchParams.get("status")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const minRating = searchParams.get("minRating")
    const maxRating = searchParams.get("maxRating")

    // OPTIMIZATION: Use PostgreSQL function for all aggregation
    // This replaces loading 2000+ rows and processing in JavaScript
    const { data, error } = await supabaseAdmin.rpc('get_feedback_stats', {
      p_org_name: orgIdFilter,
      p_purpose: purpose,
      p_user_type: userType,
      p_reaction_type: reaction,
      p_status: status,
      p_date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
      p_date_to: dateTo ? new Date(dateTo).toISOString() : null,
      p_min_rating: minRating ? Number(minRating) : null,
      p_max_rating: maxRating ? Number(maxRating) : null
    })

    if (error) {
      console.error("Error fetching feedback stats:", error)
      return NextResponse.json(
        { error: "Failed to load feedback stats" },
        { status: 500 }
      )
    }

    // PostgreSQL function returns pre-aggregated JSON
    return NextResponse.json({
      total: data.total || 0,
      averageOverall: data.averageOverall || 0,
      categoryAverages: data.categoryAverages || {},
      reactionBreakdown: data.reactionBreakdown || {},
      statusBreakdown: data.statusBreakdown || {},
      dailyTrend: data.dailyTrend || {},
      orgSummaries: data.orgSummaries || [],
    })
  } catch (error) {
    console.error("Unexpected error in GET /api/feedback/stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}




