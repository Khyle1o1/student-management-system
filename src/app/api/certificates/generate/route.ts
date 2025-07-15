import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { generateCertificatesForEvent } from "../route"

const generateCertificatesSchema = z.object({
  event_id: z.string().min(1, "Event ID is required"),
})

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
    const data = generateCertificatesSchema.parse(body)

    // Generate certificates for the event
    const result = await generateCertificatesForEvent(data.event_id)

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to generate certificates'
      }, { status: 500 })
    }

    return NextResponse.json({
      message: result.message,
      results: result.results
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/certificates/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 