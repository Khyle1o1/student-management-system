import NextAuth from "next-auth"
import { compare, hash } from "bcryptjs"
import { supabase } from "./supabase"
import { supabaseAdmin } from "./supabase-admin"
import type { Database } from "./supabase"
import { z } from "zod"
import type { NextAuthOptions, User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import type { DefaultSession } from "next-auth"
import { getServerSession } from "next-auth/next"

const ALLOWED_STUDENT_DOMAIN = "@student.buksu.edu.ph"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

function isStudentEmail(email: string) {
  return email.endsWith(ALLOWED_STUDENT_DOMAIN)
}

// Extend the base User type with additional fields needed for auth
type BaseUser = Database['public']['tables']['users']['Row']
interface DBUser extends BaseUser {
  password: string
  deletedAt?: string | null
  student?: {
    id: string
    user_id: string
    student_id: string
    name: string
    email: string
    phone: string | null
    college: string
    year_level: number
    course: string
    created_at: string
    updated_at: string
  }[] | {
    id: string
    user_id: string
    student_id: string
    name: string
    email: string
    phone: string | null
    college: string
    year_level: number
    course: string
    created_at: string
    updated_at: string
  } | null
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      email: string
      name?: string | null
      role: 'ADMIN' | 'EVENTS_STAFF' | 'INTRAMURALS_STAFF' | 'COLLEGE_ORG' | 'COURSE_ORG' | 'USER'
      student_id: string | null
      studentId: string | null
      assigned_college?: string | null
      assigned_course?: string | null
      assigned_courses?: string[] | null
      org_access_level?: 'finance' | 'event' | 'college' | null
      status?: string
      isAdminUser?: boolean // True if from users table (admin), false if student
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: 'ADMIN' | 'EVENTS_STAFF' | 'INTRAMURALS_STAFF' | 'COLLEGE_ORG' | 'COURSE_ORG' | 'USER'
    student_id: string | null
    studentId: string | null
    assigned_college?: string | null
    assigned_course?: string | null
    assigned_courses?: string[] | null
    org_access_level?: 'finance' | 'event' | 'college' | null
    status?: string
    isAdminUser?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: 'ADMIN' | 'EVENTS_STAFF' | 'INTRAMURALS_STAFF' | 'COLLEGE_ORG' | 'COURSE_ORG' | 'USER'
    student_id: string | null
    studentId: string | null
    assigned_college?: string | null
    assigned_course?: string | null
    assigned_courses?: string[] | null
    org_access_level?: 'finance' | 'event' | 'college' | null
    status?: string
    isAdminUser?: boolean
  }
}

// Simple in-memory cache for user lookups (valid for 5 minutes)
const userCache = new Map<string, { user: DBUser | null, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getUserByEmail(email: string): Promise<DBUser | null> {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim()
  
  // Check cache first
  const cached = userCache.get(normalizedEmail)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.user
  }
  
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      student:students(*)
    `)
    .eq('email', normalizedEmail)
    .is('deleted_at', null) // Don't return deleted users
    .single()
  
  if (error) {
    console.error('getUserByEmail - Error fetching user:', error)
    userCache.set(normalizedEmail, { user: null, timestamp: Date.now() })
    return null
  }

  const dbUser = user as DBUser
  
  // Cache the result
  userCache.set(normalizedEmail, { user: dbUser, timestamp: Date.now() })
  
  return dbUser
}

// Fetch a student record directly by email (no users row needed)
export async function getStudentByEmail(email: string): Promise<{
  id: string
  user_id: string | null
  student_id: string
  name: string
  email: string
  college: string
  course: string
  year_level: number
} | null> {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim()
  
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, user_id, student_id, name, email, college, course, year_level')
    .eq('email', normalizedEmail)
    .single()

  if (error) {
    return null
  }
  return data as any
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return await compare(password, hashedPassword)
}

export async function hashPassword(password: string) {
  return await hash(password, 12)
}

export async function createUser(email: string, password: string, name?: string, role: 'ADMIN' | 'EVENTS_STAFF' | 'INTRAMURALS_STAFF' | 'COLLEGE_ORG' | 'COURSE_ORG' = 'COURSE_ORG') {
  const hashedPassword = await hashPassword(password)
  
  const { data: existingUser, error: checkError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    throw new Error('User already exists')
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([
      {
        email,
        name,
        role, // Use provided role (administrative users only)
        password: hashedPassword,
        status: 'ACTIVE'
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    throw error
  }

  return data
}

export async function updateUser(userId: string, data: Partial<DBUser>) {
  const { data: updatedUser, error } = await supabaseAdmin
    .from('users')
    .update(data)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    throw error
  }

  return updatedUser
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) return null

        try {
          const { email, password } = loginSchema.parse(credentials)

          // Normalize email to lowercase for case-insensitive comparison
          const normalizedEmail = email.toLowerCase().trim()
          const dbUser = await getUserByEmail(normalizedEmail)

          if (!dbUser || dbUser.deletedAt) {
            return null
          }

          // Check if user is active
          if ((dbUser as any).status && (dbUser as any).status !== 'ACTIVE') {
            return null
          }

          const passwordMatch = await verifyPassword(password, dbUser.password)
          if (!passwordMatch) {
            return null
          }

          // Fix: Handle student as array - get first element
          const studentData = Array.isArray(dbUser.student) ? dbUser.student[0] : dbUser.student

          // Determine if this is an administrative user or a student
          const isAdminUser = ['ADMIN', 'EVENTS_STAFF', 'INTRAMURALS_STAFF', 'COLLEGE_ORG', 'COURSE_ORG'].includes(dbUser.role)

          // Convert DBUser to NextAuth User
          const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role as 'ADMIN' | 'EVENTS_STAFF' | 'INTRAMURALS_STAFF' | 'COLLEGE_ORG' | 'COURSE_ORG' | 'USER',
            student_id: studentData?.student_id || null,
            studentId: studentData?.student_id || null,
            assigned_college: (dbUser as any).assigned_college || null,
            assigned_course: (dbUser as any).assigned_course || null,
            assigned_courses: (dbUser as any).assigned_courses || null,
            org_access_level: (dbUser as any).org_access_level || null,
            status: (dbUser as any).status || 'ACTIVE',
            isAdminUser: isAdminUser,
          }

          return user
        } catch {
          return null
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          hd: "student.buksu.edu.ph" // This enforces domain restriction at OAuth level
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 1. For credentials sign in, just check if user was returned
      if (account?.type === 'credentials') {
        return !!user
      }
      
      // 2. For Google sign in, verify student email domain
      if (account?.provider === 'google' && profile?.email) {
        // Only allow student emails
        if (!isStudentEmail(profile.email)) {
          return false
        }
        
        // Allow if either an admin user exists OR a student exists
        const existingUser = await getUserByEmail(profile.email)
        if (existingUser?.student) return true

        // Fallback: check students table directly
        const student = await getStudentByEmail(profile.email)
        return !!student
      }
      
      return false
    },
    async jwt({ token, user, account }) {
      // Only set initial values when user first logs in
      if (user) {
        token.role = user.role
        token.student_id = user.student_id
        token.studentId = user.studentId
        token.assigned_college = user.assigned_college
        token.assigned_course = user.assigned_course
        token.assigned_courses = user.assigned_courses
        token.org_access_level = user.org_access_level
        token.status = user.status
        token.isAdminUser = user.isAdminUser
        return token
      }
      
      // If token doesn't have role but has email, fetch user data from database
      // This handles both initial Google OAuth and subsequent token refreshes
      if (token.email && !token.role) {
        const dbUser = await getUserByEmail(token.email)
        
        if (dbUser) {
          // Fix: Handle student as array - get first element
          const studentData = Array.isArray(dbUser.student) ? dbUser.student[0] : dbUser.student
          
          const isAdminUser = ['ADMIN', 'EVENTS_STAFF', 'INTRAMURALS_STAFF', 'COLLEGE_ORG', 'COURSE_ORG'].includes(dbUser.role)
          
          token.role = dbUser.role as 'ADMIN' | 'EVENTS_STAFF' | 'INTRAMURALS_STAFF' | 'COLLEGE_ORG' | 'COURSE_ORG' | 'USER'
          token.student_id = studentData?.student_id || null
          token.studentId = studentData?.student_id || null
          token.name = dbUser.name
          token.assigned_college = (dbUser as any).assigned_college || null
          token.assigned_course = (dbUser as any).assigned_course || null
          token.assigned_courses = (dbUser as any).assigned_courses || null
          token.org_access_level = (dbUser as any).org_access_level || null
          token.status = (dbUser as any).status || 'ACTIVE'
          token.isAdminUser = isAdminUser
          
        } else {
          // Try direct student lookup
          const student = await getStudentByEmail(token.email)
          if (student) {
            token.role = 'USER'
            token.student_id = student.student_id
            token.studentId = student.student_id
            token.name = student.name
            token.isAdminUser = false
          } else {
            console.log('JWT callback - No user or student found for email:', token.email)
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token.sub && token.role) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.student_id = token.student_id
        session.user.studentId = token.studentId
        session.user.assigned_college = token.assigned_college
        session.user.assigned_course = token.assigned_course
        session.user.assigned_courses = token.assigned_courses
         // org_access_level is only relevant for COLLEGE_ORG admin users
        session.user.org_access_level = token.org_access_level as any
        session.user.status = token.status
        session.user.isAdminUser = token.isAdminUser
      }
      
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 4 * 60 * 60, // 4 hours (reduced from 24 hours)
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // Changed from 'strict' to 'lax' to allow mode switches
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Don't set domain to allow cookies across mode switches
        // maxAge is handled by session.maxAge above
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
  },
  events: {
    async signOut() {
      // Custom sign-out event to clear any additional data if needed
      console.log('User signed out')
    }
  }
}

// Use getServerSession to get the user's session on the server
export const auth = async () => {
  return await getServerSession(authOptions)
}

// Export the NextAuth handler for the API route
const handler = NextAuth(authOptions)
export default handler 