import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"
import { z } from "zod"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

const yearLevelMap = {
  'YEAR_1': 1,
  'YEAR_2': 2,
  'YEAR_3': 3,
  'YEAR_4': 4
}

const studentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional(),
  studentId: z.string().min(1),
  college: z.string().min(1),
  yearLevel: z.string().refine(val => val in yearLevelMap, {
    message: "Invalid year level"
  }),
  course: z.string().min(1),
  phone: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional()
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'active' // all, active, archived
    
    const offset = (page - 1) * limit

    // Build query based on filter
    let countQuery = supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .ilike('name', `%${search}%`)

    let dataQuery = supabaseAdmin
      .from('students')
      .select(`
        id,
        student_id,
        name,
        email,
        college,
        course,
        year_level,
        created_at,
        archived,
        archived_at,
        user:users(
          id,
          email,
          name,
          role
        )
      `)
      .ilike('name', `%${search}%`)

    // Apply filter
    if (filter === 'active') {
      countQuery = countQuery.or('archived.is.null,archived.eq.false')
      dataQuery = dataQuery.or('archived.is.null,archived.eq.false')
    } else if (filter === 'archived') {
      countQuery = countQuery.eq('archived', true)
      dataQuery = dataQuery.eq('archived', true)
    }
    // 'all' filter shows both active and archived

    // Get total count for pagination
    const { count } = await countQuery

    // Get paginated students
    const { data: studentsData, error } = await dataQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // Transform the data to match the expected format
    const formattedStudents = studentsData.map(student => ({
      id: student.id,
      studentId: student.student_id,
      name: student.name,
      email: student.email,
      college: student.college,
      course: student.course,
      yearLevel: `YEAR_${student.year_level}`,
      enrolledAt: student.created_at,
      archived: student.archived || false,
      archivedAt: student.archived_at,
      user: student.user
    }))

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      students: formattedStudents,
      pagination: {
        totalPages,
        totalCount: count || 0,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    })

  } catch (error) {
    console.error('Error in GET /api/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = studentSchema.parse(body)

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Check if student ID already exists
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', data.studentId)
      .single()

    if (existingStudent) {
      return NextResponse.json({ error: 'Student ID already exists' }, { status: 400 })
    }

    // Create user first
    // For OAuth users, we'll set a random password that they won't use
    const hashedPassword = await hashPassword(data.password || Math.random().toString(36).slice(-8))
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        email: data.email,
        password: hashedPassword, // This will never be null now
        name: data.name,
        role: 'STUDENT'
      }])
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Then create student record
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .insert([{
        user_id: user.id,
        student_id: data.studentId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        college: data.college,
        year_level: yearLevelMap[data.yearLevel as keyof typeof yearLevelMap],
        course: data.course
      }])
      .select(`
        *,
        user:users(
          id,
          email,
          name,
          role
        )
      `)
      .single()

    if (studentError) {
      // Rollback user creation if student creation fails
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id)

      console.error('Error creating student:', studentError)
      return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
    }

    // Automatically assign applicable fees to the new student
    let feesQuery = supabaseAdmin
      .from('fee_structures')
      .select('id, amount')
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(`scope_type.eq.UNIVERSITY_WIDE,and(scope_type.eq.COLLEGE_WIDE,scope_college.eq.${data.college}),and(scope_type.eq.COURSE_SPECIFIC,scope_course.eq.${data.course})`)

    const { data: applicableFees, error: feesError } = await feesQuery

    if (!feesError && applicableFees && applicableFees.length > 0) {
      // Create payment records for all applicable fees
      const paymentRecords = applicableFees.map(fee => ({
        student_id: student.id,
        fee_id: fee.id,
        amount: fee.amount,
        status: 'UNPAID',
        payment_date: null,
      }))

      // For individual students, batch size isn't critical but keeping consistency
      const { error: paymentsError } = await supabaseAdmin
        .from('payments')
        .insert(paymentRecords)

      if (paymentsError) {
        console.error('Error creating payment records for new student:', paymentsError)
        // Log but don't fail - student was created successfully
      } else {
        console.log(`Assigned ${applicableFees.length} fees to new student`)
      }
    }

    return NextResponse.json(student, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error in POST /api/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 