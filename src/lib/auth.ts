import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { z } from "zod"
import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth/next"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Student email domain validation
const ALLOWED_STUDENT_DOMAIN = "@student.buksu.edu.ph" // Change this to your actual student domain
const isValidStudentEmail = (email: string): boolean => {
  return email.endsWith(ALLOWED_STUDENT_DOMAIN)
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
            include: { student: true }
          })

          if (!user || user.deletedAt) {
            return null
          }

          const passwordMatch = await bcrypt.compare(password, user.password)
          if (!passwordMatch) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            studentId: user.student?.studentId || null,
          }
        } catch {
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow sign in if using credentials
      if (account?.provider === 'credentials') return true;
      
      // For Google authentication - STRICT VALIDATION
      if (account?.provider === 'google' && profile?.email) {
        console.log("Google OAuth attempt for email:", profile.email)
        
        // 1. Check if email has valid student domain
        if (!isValidStudentEmail(profile.email)) {
          console.log("Invalid domain for email:", profile.email)
          return false
        }
        
        // 2. Check if user exists in database and is a student
        const existingUser = await prisma.user.findUnique({ 
          where: { email: profile.email },
          include: { student: true }
        });
        
        // 3. Only allow login if user exists and is a student
        if (!existingUser) {
          console.log("User does not exist in database:", profile.email)
          return false
        }
        
        if (existingUser.deletedAt) {
          console.log("User account is deleted:", profile.email)
          return false
        }
        
        if (existingUser.role !== 'STUDENT') {
          console.log("User is not a student:", profile.email, "Role:", existingUser.role)
          return false
        }
        
        if (!existingUser.student) {
          console.log("User exists but has no student record:", profile.email)
          return false
        }
        
        console.log("Login successful for student:", profile.email)
        return true
      }
      
      return false
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.studentId = user.studentId
      }
      
      // For Google OAuth, we need to fetch user data from database
      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { student: true }
        })
        
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.studentId = dbUser.student?.studentId || null
          token.name = dbUser.name
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.studentId = token.studentId as string | null
        session.user.name = token.name as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secure-nextauth-secret-key",
  pages: {
    signIn: "/auth/login",
    error: "/auth/error", // Custom error page
  }
}

// Use getServerSession to get the user's session on the server
export const auth = async () => {
  return await getServerSession(authOptions)
}

// Export the NextAuth handler for the API route
const handler = NextAuth(authOptions)
export default handler 