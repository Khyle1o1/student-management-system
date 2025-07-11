import NextAuth from "next-auth"
import { compare, hash } from "bcryptjs"
import { supabase } from "./supabase"
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
      role: string
      student_id: string | null
      studentId: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: string
    student_id: string | null
    studentId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    student_id: string | null
    studentId: string | null
  }
}

export async function getUserByEmail(email: string): Promise<DBUser | null> {
  console.log('getUserByEmail - Searching for email:', email)
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      student:students(*)
    `)
    .eq('email', email)
    .single()
  
  if (error) {
    console.error('getUserByEmail - Error fetching user:', error)
    return null
  }

  console.log('getUserByEmail - Raw query result:', user)
  console.log('getUserByEmail - Student data:', user?.student)

  return user as DBUser
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return await compare(password, hashedPassword)
}

export async function hashPassword(password: string) {
  return await hash(password, 12)
}

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password)
  
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    throw new Error('User already exists')
  }

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        email,
        name,
        role: 'user',
        password: hashedPassword
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
  const { data: updatedUser, error } = await supabase
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

          const dbUser = await getUserByEmail(email)

          if (!dbUser || dbUser.deletedAt) {
            return null
          }

          const passwordMatch = await verifyPassword(password, dbUser.password)
          if (!passwordMatch) {
            return null
          }

          // Fix: Handle student as array - get first element
          const studentData = Array.isArray(dbUser.student) ? dbUser.student[0] : dbUser.student

          // Convert DBUser to NextAuth User
          const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            student_id: studentData?.student_id || null,
            studentId: studentData?.student_id || null,
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
        
        // Check if user exists in database and is a student
        const existingUser = await getUserByEmail(profile.email)
        
        // Only allow login if user exists and is a student
        return !!(existingUser?.student)
      }
      
      return false
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.role = user.role
        token.student_id = user.student_id
        token.studentId = user.studentId
      }
      
      // For Google OAuth, we need to fetch user data from database
      if (account?.provider === 'google' && token.email) {
        console.log('JWT Callback - Fetching user for email:', token.email)
        const dbUser = await getUserByEmail(token.email)
        
        console.log('JWT Callback - Database user found:', !!dbUser)
        if (dbUser) {
          console.log('JWT Callback - User ID:', dbUser.id)
          console.log('JWT Callback - User role:', dbUser.role)
          console.log('JWT Callback - User student object:', dbUser.student)
          
          // Fix: Handle student as array - get first element
          const studentData = Array.isArray(dbUser.student) ? dbUser.student[0] : dbUser.student
          console.log('JWT Callback - Student data (first element):', studentData)
          console.log('JWT Callback - Student ID from student object:', studentData?.student_id)
          
          token.role = dbUser.role
          token.student_id = studentData?.student_id || null
          token.studentId = studentData?.student_id || null
          token.name = dbUser.name
          
          console.log('JWT Callback - Final token values:')
          console.log('  - role:', token.role)
          console.log('  - student_id:', token.student_id)
          console.log('  - studentId:', token.studentId)
        } else {
          console.log('JWT Callback - No user found in database for email:', token.email)
        }
      }
      
      // Also check if we need to refresh student data for existing tokens
      if (token.role === 'STUDENT' && 
          !token.studentId && 
          token.email && 
          isStudentEmail(token.email) && 
          !account) {
        console.log('JWT Callback - Refreshing missing student data for existing token')
        const dbUser = await getUserByEmail(token.email)
        
        if (dbUser?.student) {
          const studentData = Array.isArray(dbUser.student) ? dbUser.student[0] : dbUser.student
          token.student_id = studentData?.student_id || null
          token.studentId = studentData?.student_id || null
          console.log('JWT Callback - Refreshed studentId:', token.studentId)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      console.log('Session Callback - Input token:', {
        sub: token.sub,
        role: token.role,
        student_id: token.student_id,
        studentId: token.studentId,
        email: token.email
      })
      
      if (token.sub && token.role) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.student_id = token.student_id
        session.user.studentId = token.studentId
        
        // Force refresh if student should have studentId but doesn't
        if (token.role === 'STUDENT' && 
            !token.studentId && 
            token.email && 
            isStudentEmail(token.email)) {
          console.log('Session Callback - Detected missing studentId for student, will force refresh on next request')
          // This will be handled by the JWT callback trigger mechanism
        }
      }
      
      console.log('Session Callback - Final session.user:', {
        id: session.user.id,
        role: session.user.role,
        student_id: session.user.student_id,
        studentId: session.user.studentId
      })
      
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
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
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