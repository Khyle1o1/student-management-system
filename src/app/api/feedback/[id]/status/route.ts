import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"

const statusSchema = z.object({
  status: z.enum(["NEW", "ACKNOWLEDGED", "RESOLVED"]),
})

function isAdmin(role?: string | null) {
  return role === "ADMIN"
}

export async function PATCH(request: NextRequest, context: any) {
  const { params } = context as { params: { id: string } }
  try {
    const session = await auth()
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = statusSchema.parse(body)
    const feedbackId = params.id

    const { data: feedback, error: fetchError } = await supabaseAdmin
      .from("organization_feedback")
      .select("id, org_id, status")
      .eq("id", feedbackId)
      .single()

    if (fetchError || !feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("organization_feedback")
      .update({ status: parsed.status, updated_at: new Date().toISOString() })
      .eq("id", feedbackId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating feedback status:", updateError)
      return NextResponse.json(
        { error: "Unable to update feedback status" },
        { status: 500 }
      )
    }

    return NextResponse.json({ feedback: data })
  } catch (error: any) {
    console.error("Unexpected error in PATCH /api/feedback/[id]/status:", error)
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => i.message).join(", ")
        : "Internal server error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}




