import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSystemSettings } from "@/lib/system-settings"

/**
 * Maintenance Mode Middleware
 * Checks if the system is in maintenance mode and blocks access for non-admin users
 * 
 * @param request - The incoming request
 * @returns NextResponse or null (null means allow access)
 */
export async function checkMaintenanceMode(request: NextRequest): Promise<NextResponse | null> {
  try {
    // Get system settings to check maintenance mode
    const settings = await getSystemSettings()
    
    // If maintenance mode is not enabled, allow all requests
    if (!settings.maintenance_mode) {
      return null
    }

    // Get user token to check role
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    // If user is not authenticated or is not ADMIN, block access
    if (!token || token.role !== "ADMIN") {
      const url = request.nextUrl.clone()
      
      // If this is an API request, return JSON response
      if (url.pathname.startsWith('/api/')) {
        // Allow access to settings, auth, and system monitoring endpoints
        if (
          url.pathname === '/api/settings' ||
          url.pathname.startsWith('/api/auth/') ||
          url.pathname.startsWith('/api/system/')
        ) {
          return null
        }
        
        return NextResponse.json(
          {
            status: "maintenance",
            message: "System is under maintenance. Please try again later."
          },
          { status: 503 }
        )
      }
      
      // For page requests, redirect to maintenance page
      if (url.pathname !== '/maintenance' && !url.pathname.startsWith('/auth/')) {
        url.pathname = '/maintenance'
        return NextResponse.redirect(url)
      }
    }

    // ADMIN users can access everything during maintenance
    return null
  } catch (error) {
    console.error("Error in maintenance mode middleware:", error)
    // On error, allow access (fail open to prevent lockout)
    return null
  }
}
