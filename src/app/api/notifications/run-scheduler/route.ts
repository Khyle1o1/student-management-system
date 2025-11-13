import { NextRequest, NextResponse } from 'next/server'
import { runScheduledReminders } from '@/lib/reminder-scheduler'

export const dynamic = 'force-dynamic'

// POST run the scheduler
export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (use a secret token for cron jobs)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token-here'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results = await runScheduledReminders()

    return NextResponse.json({
      success: true,
      message: 'Scheduler run completed',
      results,
    })
  } catch (error) {
    console.error('Error running scheduler:', error)
    return NextResponse.json(
      { error: 'Failed to run scheduler' },
      { status: 500 }
    )
  }
}

// GET endpoint for manual trigger by admins
export async function GET() {
  try {
    const results = await runScheduledReminders()

    return NextResponse.json({
      success: true,
      message: 'Scheduler run completed manually',
      results,
    })
  } catch (error) {
    console.error('Error running scheduler:', error)
    return NextResponse.json(
      { error: 'Failed to run scheduler' },
      { status: 500 }
    )
  }
}

