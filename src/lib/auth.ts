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

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "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",
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
      // Allow sign in if using credentials or if Google email exists
      if (account?.provider === 'credentials') return true;
      
      // For Google authentication
      if (account?.provider === 'google' && profile?.email) {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ 
          where: { email: profile.email },
          include: { student: true }
        });
        
        if (existingUser) {
          // User exists, just update their info if needed
          return true;
        } else {
          // Create a new user from Google profile
          try {
            const newUser = await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name || 'Google User',
                // No password needed for Google OAuth
                password: '',
                role: 'STUDENT',
              }
            });
            return true;
          } catch (error) {
            console.error("Error creating user from Google profile:", error);
            return false;
          }
        }
      }
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.studentId = user.studentId
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.studentId = token.studentId
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secure-nextauth-secret-key",
  pages: {
    signIn: "/auth/login",
  }
}

// Use getServerSession to get the user's session on the server
export const auth = async () => {
  return await getServerSession(authOptions)
}

// Export the NextAuth handler for the API route
const handler = NextAuth(authOptions)
export default handler 