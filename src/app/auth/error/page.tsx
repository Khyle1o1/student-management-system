"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ArrowLeft } from "lucide-react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case "AccessDenied":
        return "Login failed: Only registered student emails can access the system."
      case "OAuthSignin":
        return "There was an error with Google authentication. Please try again."
      case "OAuthCallback":
        return "Authentication callback failed. Please try again."
      case "OAuthCreateAccount":
        return "Login failed: Only registered student emails can access the system."
      case "EmailCreateAccount":
        return "Login failed: Only registered student emails can access the system."
      case "Callback":
        return "Login failed: Only registered student emails can access the system."
      default:
        return "Login failed: Only registered student emails can access the system."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Authentication Failed</CardTitle>
          <CardDescription>
            Unable to sign you in to the Student Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              {getErrorMessage(error)}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
              <p className="font-medium mb-2">Access Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Must have a valid Google account</li>
                <li>Email must be from the registered student domain</li>
                <li>Must be a registered student in the system</li>
                <li>Account must be active and not deleted</li>
              </ul>
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">If you believe this is an error:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Contact your system administrator</li>
                <li>Verify your student email address is registered</li>
                <li>Ensure you're using your institutional Google account</li>
              </ul>
            </div>

            <Button asChild className="w-full">
              <Link href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 