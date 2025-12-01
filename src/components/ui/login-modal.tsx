"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loginSchema, type LoginFormData } from "@/lib/validations"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Chrome, Mail, Lock, AlertTriangle, X, Loader2 } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Close modal and redirect if user is authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      onClose()
      router.push("/dashboard")
      router.refresh()
    }
  }, [status, session, onClose, router])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setError("")
      setIsLoading(false)
      setIsGoogleLoading(false)
      setIsRedirecting(false)
    }
  }, [isOpen, reset])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

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
        setIsRedirecting(true)
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
        redirect: false,
        prompt: "consent select_account",
        hd: "student.buksu.edu.ph"
      })
      setIsRedirecting(true)
    } catch (error) {
      setError("Google sign-in failed. Please try again.")
      setIsGoogleLoading(false)
      setIsRedirecting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="relative shadow-2xl border-0">
          {isRedirecting && (
            <div className="absolute inset-0 z-20 rounded-2xl bg-white/85 flex flex-col items-center justify-center text-center px-8">
              <Loader2 className="h-8 w-8 text-[#191970] animate-spin" />
              <p className="mt-4 text-sm font-medium text-[#191970]">Signing you in... please wait</p>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
          
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-[#191970]">Student Login</CardTitle>
            <CardDescription className="text-center">
              Sign in to SmartU
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-6">
            {/* Google OAuth Login */}
            <div className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
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
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#191970] to-[#191970]/80 hover:from-[#191970]/90 hover:to-[#191970]/70"
                disabled={isLoading || isGoogleLoading}
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
    </div>
  )
} 