import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Database status check should be publicly accessible for system monitoring
    // No authentication required for health checks
    
    // Try a simple query to check database connection
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Database connection check failed:", error)
    
    // Determine the specific error type
    let errorCode = 'UNKNOWN'
    let errorMessage = 'Failed to connect to database'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for Prisma specific error codes
      if ('code' in error) {
        const prismaError = error as any
        errorCode = prismaError.code
        
        switch(prismaError.code) {
          case 'P1001':
            errorMessage = "Can't reach database server"
            break
          case 'P1002':
            errorMessage = "Database server connection timed out"
            break
          case 'P1017':
            errorMessage = "Server has closed the connection"
            break
        }
      }
    }
    
    return NextResponse.json({ 
      status: 'disconnected',
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
} 