"use client"

import { AlertTriangle, Clock, Wrench } from "lucide-react"
import { useEffect, useState } from "react"

export function MaintenanceBanner() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store"
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsMaintenanceMode(data.maintenance_mode || false)
        }
      } catch (error) {
        console.error("Error checking maintenance mode:", error)
        setIsMaintenanceMode(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkMaintenance()
  }, [])

  // Don't render anything while loading or if not in maintenance mode
  if (isLoading || !isMaintenanceMode) {
    return null
  }

  return (
    <div className="fixed top-20 left-0 right-0 z-40 animate-in slide-in-from-top duration-500">
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 shadow-2xl border-b-4 border-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Animated Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 blur-xl rounded-full animate-pulse"></div>
              <div className="relative bg-white/20 backdrop-blur-sm p-3 rounded-full border-2 border-white/40">
                <Wrench className="w-6 h-6 text-white animate-bounce" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="text-white font-bold text-lg">
                  System Under Maintenance
                </h3>
              </div>
              <p className="text-white/90 text-sm">
                The system is temporarily unavailable. Only administrators can access during this time.
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">In Progress</span>
            </div>
          </div>

          {/* Progress Bar Animation */}
          <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/60 rounded-full animate-pulse" style={{
              width: '100%',
              animation: 'shimmer 2s infinite'
            }}></div>
          </div>
        </div>
      </div>

      {/* Shimmer animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  )
}
