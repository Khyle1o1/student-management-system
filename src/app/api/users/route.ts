import { NextRequest, NextResponse } from 'next/server';
import { auth, hashPassword } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { canManageUsers, canCreateRole, getAccessFilter, validateUserAssignment, type UserRole, type UserStatus } from '@/lib/rbac';
import { z } from 'zod';

// Validation schema for creating a user (ONLY administrative users)
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'] as const),
  assigned_college: z.string().optional().nullable(),
  assigned_course: z.string().optional().nullable(),
  assigned_courses: z.array(z.string()).max(2).min(1).optional().nullable(),
});

// Validation schema for updating a user (ONLY administrative users)
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'] as const).optional(),
  assigned_college: z.string().optional().nullable(),
  assigned_course: z.string().optional().nullable(),
  assigned_courses: z.array(z.string()).max(2).min(1).optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED'] as const).optional(),
});

/**
 * GET /api/users
 * Get all users (with filtering based on role)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's details for permission checking
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course, assigned_courses')
      .eq('id', session.user.id)
      .single();

    if (!currentUser || !canManageUsers(currentUser)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage users' },
        { status: 403 }
      );
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');
    const collegeFilter = searchParams.get('college');
    const searchQuery = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Default 100 per page

    // Build query based on user's access level
    // IMPORTANT: Only show administrative users (ADMIN, COLLEGE_ORG, COURSE_ORG)
    // Students are managed separately in the students table
    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course, created_at, updated_at, archived_at', { count: 'exact' })
      .is('deleted_at', null) // Don't show permanently deleted users
      .in('role', ['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG']); // Only administrative users

    // Apply access filter based on role
    const accessFilter = getAccessFilter(currentUser);
    
    if (accessFilter.type === 'COLLEGE') {
      // COLLEGE_ORG can only see users in their college
      query = query.or(`assigned_college.eq.${accessFilter.college},role.eq.COURSE_ORG`);
    } else if (accessFilter.type === 'COURSE') {
      // COURSE_ORG cannot manage users
      return NextResponse.json(
        { error: 'You do not have permission to view users' },
        { status: 403 }
      );
    }
    // ADMIN (ALL) sees everyone

    // Apply filters
    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (collegeFilter) {
      query = query.eq('assigned_college', collegeFilter);
    }

    if (searchQuery) {
      query = query.or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      users,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's details for permission checking
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, assigned_college, assigned_course, assigned_courses')
      .eq('id', session.user.id)
      .single();

    if (!currentUser || !canManageUsers(currentUser)) {
      return NextResponse.json(
        { error: 'You do not have permission to create users' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Normalize and trim fields
    if (body.name) body.name = body.name.trim();
    if (body.email) body.email = body.email.trim().toLowerCase();
    // Normalize empty strings to null for optional fields
  if (body.assigned_college === '') body.assigned_college = null;
  if (body.assigned_course === '') body.assigned_course = null;
  // Normalize assigned_courses to array of up to 2 unique strings
  if (Array.isArray(body.assigned_courses)) {
    body.assigned_courses = body.assigned_courses
      .map((s: string) => (s || '').trim())
      .filter((s: string) => !!s)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .slice(0, 2)
  } else if (typeof body.assigned_courses === 'string') {
    const single = body.assigned_courses.trim()
    body.assigned_courses = single ? [single] : null
  }
    
    console.log('Creating user with data:', {
      email: body.email,
      name: body.name,
      role: body.role,
      hasPassword: !!body.password,
      passwordLength: body.password?.length,
      assigned_college: body.assigned_college,
      assigned_course: body.assigned_course,
    });
    
    const validatedData = createUserSchema.parse(body);

    // Check if current user can create this role
    if (!canCreateRole(currentUser, validatedData.role)) {
      return NextResponse.json(
        { error: `You do not have permission to create ${validatedData.role} users` },
        { status: 403 }
      );
    }

    // Validate assignment based on role
    const assignmentValidation = validateUserAssignment(
      validatedData.role,
      validatedData.assigned_college,
      (validatedData.assigned_courses && validatedData.assigned_courses.length > 0)
        ? validatedData.assigned_courses[0]
        : validatedData.assigned_course
    );

    if (!assignmentValidation.valid) {
      return NextResponse.json(
        { error: assignmentValidation.error },
        { status: 400 }
      );
    }

    // If COLLEGE_ORG is creating a COURSE_ORG, ensure it's under their college
    if (currentUser.role === 'COLLEGE_ORG' && validatedData.role === 'COURSE_ORG') {
      if (validatedData.assigned_college !== currentUser.assigned_college) {
        return NextResponse.json(
          { error: 'You can only create Course Organizations under your assigned college' },
          { status: 403 }
        );
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          role: validatedData.role,
          assigned_college: validatedData.assigned_college || null,
          assigned_course: (validatedData.assigned_courses && validatedData.assigned_courses.length > 0)
            ? validatedData.assigned_courses[0]
            : (validatedData.assigned_course || null),
          assigned_courses: validatedData.assigned_courses || null,
          status: 'ACTIVE',
        },
      ])
      .select('id, email, name, role, status, assigned_college, assigned_course, assigned_courses, created_at')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Log the creation in audit log
    await supabaseAdmin.from('user_audit_log').insert([
      {
        user_id: newUser.id,
        action: 'USER_CREATED',
        performed_by: session.user.id,
        details: {
          role: newUser.role,
          assigned_college: newUser.assigned_college,
          assigned_course: newUser.assigned_course,
          courses: newUser.assigned_courses,
        },
      },
    ]);

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: newUser,
      },
      { status: 201 }
    );
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

    console.error('Unexpected error in POST /api/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

