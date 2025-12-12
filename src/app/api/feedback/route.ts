import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { COLLEGES } from "@/lib/constants/academic-programs"

const EXTRA_ALLOWED = ["Supreme Student Council"]
const ALLOWED_NAMES = [...COLLEGES, ...EXTRA_ALLOWED]

const ratingSchema = z.object({
  accessibility: z.number().int().min(1).max(5),
  responsiveness: z.number().int().min(1).max(5),
  transparency: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  helpfulness: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  event_quality: z.number().int().min(1).max(5),
  overall_rating: z.number().int().min(1).max(5),
})

const createFeedbackSchema = z.object({
  org_name: z.enum(ALLOWED_NAMES as [string, ...string[]]),
  user_type: z
    .enum(["Student", "Parent", "Alumni", "Faculty", "Visitor", "Other"])
    .default("Student"),
  purpose: z
    .enum([
      "Concern / Complaint",
      "Suggestion",
      "Appreciation",
      "Event Feedback",
      "Service Feedback",
      "Other",
    ])
    .default("Concern / Complaint"),
  reaction_type: z
    .enum(["positive", "negative", "suggestion", "complaint", "other"])
    .default("suggestion"),
  comment: z.string().trim().max(4000).optional().nullable(),
  ratings: ratingSchema,
})

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
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      200
    )
    const offset = (page - 1) * limit

    const orgIdFilter = searchParams.get("orgId")
    const purpose = searchParams.get("purpose")
    const userType = searchParams.get("userType")
    const reaction = searchParams.get("reactionType")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const minRating = searchParams.get("minRating")
    const maxRating = searchParams.get("maxRating")

    let query: any = supabaseAdmin
      .from("organization_feedback")
      .select(
        `
        id,
        org_name,
        user_type,
        purpose,
        accessibility,
        responsiveness,
        transparency,
        professionalism,
        helpfulness,
        communication,
        event_quality,
        overall_rating,
        reaction_type,
        comment,
        status,
        created_at,
        updated_at
      `,
        { count: "exact" }
      )

    if (orgIdFilter) {
      query = query.eq("org_name", orgIdFilter)
    }

    if (purpose) query = query.eq("purpose", purpose)
    if (userType) query = query.eq("user_type", userType)
    if (reaction) query = query.eq("reaction_type", reaction)
    if (status) query = query.eq("status", status)
    if (dateFrom) query = query.gte("created_at", dateFrom)
    if (dateTo) query = query.lte("created_at", dateTo)
    if (minRating) query = query.gte("overall_rating", Number(minRating))
    if (maxRating) query = query.lte("overall_rating", Number(maxRating))
    if (search) {
      query = query.or(`comment.ilike.%${search}%`)
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching feedback:", error)
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      feedback: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("Unexpected error in GET /api/feedback:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createFeedbackSchema.parse(body)

    // Validate organization exists and is one of the allowed colleges
    const payload = {
      org_id: null,
      org_name: parsed.org_name,
      user_type: parsed.user_type || null,
      purpose: parsed.purpose || null,
      accessibility: parsed.ratings.accessibility,
      responsiveness: parsed.ratings.responsiveness,
      transparency: parsed.ratings.transparency,
      professionalism: parsed.ratings.professionalism,
      helpfulness: parsed.ratings.helpfulness,
      communication: parsed.ratings.communication,
      event_quality: parsed.ratings.event_quality,
      overall_rating: parsed.ratings.overall_rating,
      reaction_type: parsed.reaction_type || null,
      comment: parsed.comment || null,
      status: "NEW",
    }

    const { error: insertError, data } = await supabaseAdmin
      .from("organization_feedback")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("Error saving feedback:", insertError)
      return NextResponse.json(
        { error: "Unable to save feedback right now. Please try again." },
        { status: 500 }
      )
    }

    // No notifications because submissions are routed to admin only

    return NextResponse.json({
      message:
        "Your feedback has been received and forwarded to the selected organization.",
    })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/feedback:", error)
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => i.message).join(", ")
        : "Internal server error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}




