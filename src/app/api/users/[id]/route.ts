import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { canManageUsers, canCreateRole, validateUserAssignment, type UserRole } from '@/lib/rbac';
import { z } from 'zod';
import { ensureDeletionNotLocked } from '@/lib/system-settings';

// Validation schema for updating a user (ONLY administrative users)
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'] as const).optional(),
  assigned_college: z.string().optional().nullable(),
  assigned_course: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED'] as const).optional(),
});

/**
 * GET /api/users/[id]
 * Get a specific user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's details for permission checking
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course')
      .eq('id', session.user.id)
      .single();

    if (!currentUser || !canManageUsers(currentUser)) {
      return NextResponse.json(
        { error: 'You do not have permission to view users' },
        { status: 403 }
      );
    }

    // Fetch the target user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course, created_at, updated_at, archived_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if current user has permission to view this user
    if (currentUser.role === 'COLLEGE_ORG') {
      // COLLEGE_ORG can only see users in their college
      if (
        user.assigned_college !== currentUser.assigned_college &&
        user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'You do not have permission to view this user' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Unexpected error in GET /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update a user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's details for permission checking
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course')
      .eq('id', session.user.id)
      .single();

    if (!currentUser || !canManageUsers(currentUser)) {
      return NextResponse.json(
        { error: 'You do not have permission to update users' },
        { status: 403 }
      );
    }

    // Fetch the target user
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent users from editing themselves
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot edit your own account through this interface' },
        { status: 403 }
      );
    }

    // Check if current user has permission to edit this user
    if (currentUser.role === 'COLLEGE_ORG') {
      // COLLEGE_ORG can only edit COURSE_ORG in their college
      if (
        targetUser.role !== 'COURSE_ORG' ||
        targetUser.assigned_college !== currentUser.assigned_college
      ) {
        return NextResponse.json(
          { error: 'You do not have permission to edit this user' },
          { status: 403 }
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Normalize empty strings to null for optional fields
    if (body.assigned_college === '') body.assigned_college = null;
    if (body.assigned_course === '') body.assigned_course = null;
    
    const validatedData = updateUserSchema.parse(body);

    // If role is being changed, check permissions
    if (validatedData.role && validatedData.role !== targetUser.role) {
      if (!canCreateRole(currentUser, validatedData.role)) {
        return NextResponse.json(
          { error: `You do not have permission to assign ${validatedData.role} role` },
          { status: 403 }
        );
      }
    }

    // Validate assignment based on role (use new role if changing, otherwise current)
    const finalRole = validatedData.role || targetUser.role;
    const finalCollege = validatedData.assigned_college !== undefined 
      ? validatedData.assigned_college 
      : targetUser.assigned_college;
    const finalCourse = validatedData.assigned_course !== undefined
      ? validatedData.assigned_course
      : targetUser.assigned_course;

    const assignmentValidation = validateUserAssignment(
      finalRole,
      finalCollege,
      finalCourse
    );

    if (!assignmentValidation.valid) {
      return NextResponse.json(
        { error: assignmentValidation.error },
        { status: 400 }
      );
    }

    // Update the user
    const updateData: any = {};
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.assigned_college !== undefined) updateData.assigned_college = validatedData.assigned_college;
    if (validatedData.assigned_course !== undefined) updateData.assigned_course = validatedData.assigned_course;
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      // Set archived_at if archiving
      if (validatedData.status === 'ARCHIVED') {
        updateData.archived_at = new Date().toISOString();
      } else if (targetUser.status === 'ARCHIVED') {
        // Clear archived_at if un-archiving (status is changing from ARCHIVED)
        updateData.archived_at = null;
      }
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, name, role, status, assigned_college, assigned_course, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log the update in audit log
    await supabaseAdmin.from('user_audit_log').insert([
      {
        user_id: updatedUser.id,
        action: 'USER_UPDATED',
        performed_by: session.user.id,
        details: {
          old_role: targetUser.role,
          new_role: updatedUser.role,
          old_status: targetUser.status,
          new_status: updatedUser.status,
          changes: validatedData,
        },
      },
    ]);

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors for better user experience
      const formattedErrors = error.errors.map(err => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      });
      
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: formattedErrors.join(', '),
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Unexpected error in PATCH /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Archive a user (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const lockResponse = await ensureDeletionNotLocked();
    if (lockResponse) {
      return lockResponse;
    }

    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's details for permission checking
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course')
      .eq('id', session.user.id)
      .single();

    if (!currentUser || !canManageUsers(currentUser)) {
      return NextResponse.json(
        { error: 'You do not have permission to archive users' },
        { status: 403 }
      );
    }

    // Require password confirmation from the acting admin/college org
    const body = await request.json().catch(() => ({}));
    const providedPassword: string | undefined = body?.password;
    if (!providedPassword) {
      return NextResponse.json(
        { error: 'Password is required to archive a user' },
        { status: 400 }
      );
    }

    // Verify the acting user's password
    const { data: actingUserWithPassword } = await supabaseAdmin
      .from('users')
      .select('id, password')
      .eq('id', session.user.id)
      .single();

    // Fallback error if somehow not found
    if (!actingUserWithPassword?.password) {
      return NextResponse.json(
        { error: 'Unable to verify acting user credentials' },
        { status: 401 }
      );
    }

    // Lazy import to avoid circular deps from auth.ts default export
    const { verifyPassword } = await import('@/lib/auth');
    const isPasswordValid = await verifyPassword(
      providedPassword,
      actingUserWithPassword.password as unknown as string
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Fetch the target user
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent users from deleting themselves
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot archive your own account' },
        { status: 403 }
      );
    }

    // Check if current user has permission to delete this user
    if (currentUser.role === 'COLLEGE_ORG') {
      // COLLEGE_ORG can only delete COURSE_ORG in their college
      if (
        targetUser.role !== 'COURSE_ORG' ||
        targetUser.assigned_college !== currentUser.assigned_college
      ) {
        return NextResponse.json(
          { error: 'You do not have permission to archive this user' },
          { status: 403 }
        );
      }
    }

    // HARD DELETE (soft-delete semantics): mark deleted_at, and archive for audit
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        status: 'ARCHIVED',
        archived_at: nowIso,
        deleted_at: nowIso,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error archiving user:', updateError);
      return NextResponse.json(
        { error: 'Failed to archive user' },
        { status: 500 }
      );
    }

    // Log the hard delete in audit log
    await supabaseAdmin.from('user_audit_log').insert([
      {
        user_id: targetUser.id,
        action: 'USER_DELETED',
        performed_by: session.user.id,
        details: {
          archived_user_email: targetUser.email,
          archived_user_role: targetUser.role,
          hard_delete: true
        },
      },
    ]);

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

