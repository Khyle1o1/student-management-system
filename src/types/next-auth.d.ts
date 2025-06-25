import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      studentId: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    studentId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    studentId: string | null
  }
} 