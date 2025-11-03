// This endpoint is deprecated
// Use archive functionality instead
// Bulk delete has been removed to prevent accidental data loss
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  return NextResponse.json({ 
    error: 'Bulk delete is no longer supported. Use archive functionality instead.' 
  }, { status: 410 })
}

export async function DELETE(request: Request) {
  return NextResponse.json({ 
    error: 'Bulk delete is no longer supported. Use archive functionality instead.' 
  }, { status: 410 })
} 