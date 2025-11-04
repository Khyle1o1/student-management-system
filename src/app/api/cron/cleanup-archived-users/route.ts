import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Cron job to automatically delete users who have been archived for 2+ years
 * This should be called periodically (e.g., daily or weekly)
 * 
 * Usage:
 * - Can be called manually: GET /api/cron/cleanup-archived-users
 * - Can be scheduled using a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 * 
 * Example cron schedule (in vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-archived-users",
 *     "schedule": "0 0 * * 0"  // Every Sunday at midnight
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication via header token for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate the date 2 years ago
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const cutoffDate = twoYearsAgo.toISOString();

    // Find users archived for 2+ years
    const { data: usersToDelete, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, archived_at')
      .eq('status', 'ARCHIVED')
      .is('deleted_at', null)
      .lt('archived_at', cutoffDate);

    if (fetchError) {
      console.error('Error fetching archived users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch archived users' },
        { status: 500 }
      );
    }

    if (!usersToDelete || usersToDelete.length === 0) {
      return NextResponse.json({
        message: 'No users to delete',
        deleted_count: 0,
        deleted_users: []
      });
    }

    // Soft delete these users by setting deleted_at
    const userIds = usersToDelete.map(u => u.id);
    
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', userIds);

    if (deleteError) {
      console.error('Error deleting archived users:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete archived users' },
        { status: 500 }
      );
    }

    // Log the cleanup action
    await supabaseAdmin.from('user_audit_log').insert(
      usersToDelete.map(user => ({
        user_id: user.id,
        action: 'USER_AUTO_DELETED',
        performed_by: null, // System action
        details: {
          email: user.email,
          role: user.role,
          archived_at: user.archived_at,
          auto_deleted_reason: 'Archived for 2+ years'
        }
      }))
    );

    console.log(`Cleanup job: Deleted ${usersToDelete.length} users archived for 2+ years`);

    return NextResponse.json({
      message: `Successfully deleted ${usersToDelete.length} user(s)`,
      deleted_count: usersToDelete.length,
      deleted_users: usersToDelete.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        archived_at: u.archived_at
      }))
    });
  } catch (error) {
    console.error('Unexpected error in cleanup job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

