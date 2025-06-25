"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loginSchema, type LoginFormData } from "@/lib/validations"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Chrome, Mail, Lock, AlertTriangle } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check for error from URL params (from auth failures)
  const urlError = searchParams.get("error")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const getUrlErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case "AccessDenied":
        return "Login failed: Only registered student emails can access the system."
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "EmailCreateAccount":
      case "Callback":
        return "Login failed: Only registered student emails can access the system."
      default:
        return null
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError("")
    
    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: true,
      })
    } catch (error) {
      setError("Google sign-in failed. Please try again.")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Student Login</CardTitle>
          <CardDescription className="text-center">
            Sign in to the Student Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Display URL error if present */}
          {urlError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {getUrlErrorMessage(urlError)}
              </AlertDescription>
            </Alert>
          )}

          {/* Google OAuth Login */}
          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
              variant="outline"
            >
              {isGoogleLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
              ) : (
                <Chrome className="mr-2 h-4 w-4 text-blue-600" />
              )}
              {isGoogleLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            <div className="text-xs text-center text-gray-500 bg-blue-50 p-3 rounded-md">
              <Lock className="inline h-3 w-3 mr-1" />
              Only registered student emails (@student.buksu.edu.ph) can access the system
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with credentials</span>
              </div>
            </div>
          </div>

          {/* Credentials Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your student email"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Information section */}
          <div className="mt-6 text-center">
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-1">Access Information</p>
              <p>Only registered students can access this system. Contact your administrator if you need assistance.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 