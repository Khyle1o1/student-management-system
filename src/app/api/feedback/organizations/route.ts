import { NextResponse } from "next/server"
import { COLLEGES } from "@/lib/constants/academic-programs"

const EXTRA_ALLOWED = ["Supreme Student Council"]
const ALLOWED_NAMES = [...COLLEGES, ...EXTRA_ALLOWED]

export async function GET() {
  try {
    // Static list; no user lookup
    const organizations = ALLOWED_NAMES.map((name) => ({
      id: name,
      name,
    }))
    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("Unexpected error in GET /api/feedback/organizations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}




