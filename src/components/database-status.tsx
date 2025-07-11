"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, XCircle, Database, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DatabaseStatusProps {
  pollingInterval?: number // in milliseconds
  onStatusChange?: (isConnected: boolean) => void
  className?: string
}

export function DatabaseStatus({
  pollingInterval = 30000,
  onStatusChange,
  className
}: DatabaseStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  const checkDatabaseConnection = useCallback(async () => {
    try {
      setIsPolling(true)
      const response = await fetch('/api/system/db-status')
      const data = await response.json()
      
      // Fix: Check for 'ok' status instead of 'connected' to match the API response
      const connected = response.ok && (data.status === 'ok' || data.status === 'connected')
      setIsConnected(connected)
      
      if (!connected) {
        setErrorMessage(data.error || data.message || "Unable to connect to database")
        setShowAlert(true)
      } else {
        setErrorMessage(null)
        // Auto-hide success message after 3 seconds
        if (showAlert) {
          setTimeout(() => setShowAlert(false), 3000)
        }
      }
      
      if (onStatusChange) {
        onStatusChange(connected)
      }
    } catch (error) {
      console.error('Database status check failed:', error)
      setIsConnected(false)
      setErrorMessage("Failed to check database connection")
      setShowAlert(true)
      
      if (onStatusChange) {
        onStatusChange(false)
      }
    } finally {
      setIsPolling(false)
    }
  }, [onStatusChange, showAlert])

  useEffect(() => {
    // Check connection immediately on mount
    checkDatabaseConnection()
    
    // Set up polling
    const interval = setInterval(checkDatabaseConnection, pollingInterval)
    
    return () => clearInterval(interval)
  }, [pollingInterval, checkDatabaseConnection])

  if (isConnected === null) {
    return null // Don't show anything while initial check is in progress
  }

  if (isConnected && !showAlert) {
    return null // Don't show anything when connected (unless alert is forced)
  }

  return (
    <div className={cn(
      "bg-red-50 border-b border-red-200 p-2 fixed top-0 left-0 right-0 z-50",
      isConnected && "bg-green-50 border-green-200",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            
            <div>
              <p className={cn(
                "text-sm font-medium",
                isConnected ? "text-green-800" : "text-red-800"
              )}>
                {isConnected 
                  ? "Database connection restored" 
                  : errorMessage || "Database connection error"}
              </p>
              {!isConnected && (
                <p className="text-xs text-red-700 hidden sm:block">
                  Some features may be unavailable until the connection is restored.
                </p>
              )}
            </div>
            
            {isPolling && (
              <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!isConnected && (
              <Button
                size="sm"
                variant="outline"
                onClick={checkDatabaseConnection}
                className="text-red-700 hover:text-red-900 hover:bg-red-100 text-xs"
              >
                <Database className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "hover:bg-red-100",
                isConnected ? "text-green-700 hover:text-green-900" : "text-red-700 hover:text-red-900"
              )}
              onClick={() => setShowAlert(false)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 