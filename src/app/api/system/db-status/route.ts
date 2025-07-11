import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test the connection by making a simple query to a table that should exist
    // Use a basic query that doesn't require special permissions
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Database connection error:', error)
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to database',
        error: error.message,
        config: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Database connection successful',
      config: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    })

  } catch (error) {
    console.error('Database status check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Database connection check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    }, { status: 500 })
  }
} 