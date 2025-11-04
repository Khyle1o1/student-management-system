"use client"

import { ReactNode, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  Settings, 
  LogOut,
  BarChart3,
  User,
  Menu,
  Bell,
  Search,
  ChevronRight,
  DatabaseIcon,
  AlertTriangle,
  XCircle,
  X,
  ClipboardCheck,
  Award,
  UserCog
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { completeLogout } from "@/lib/google-oauth-utils"

interface DashboardShellProps {
  children: ReactNode
}

interface DashboardStats {
  students: {
    total: number
    new: number
    growthPercent: number
  }
  events: {
    total: number
    upcoming: number
    thisMonth: number
    growthPercent: number
  }
  payments: {
    total: number
    pending: number
    unpaidPercent: number
  }
}

interface NavigationItem {
  href: string
  label: string
  icon: any
  badge?: string
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isAdmin = session?.user?.role === "ADMIN"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [dbConnectionError, setDbConnectionError] = useState<string | null>(null)
  const [showDbError, setShowDbError] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
          setDbConnectionError(null)
          setShowDbError(false)
        } else {
          const errorData = await response.json()
          // Check if it's a database connection error
          if (errorData.error && 
              (errorData.error.includes("Can't reach database") || 
               errorData.error.includes("P1001") || 
               errorData.error.includes("P1002") || 
               errorData.error.includes("P1017"))) {
            setDbConnectionError("Database connection error: Unable to connect to the database server.")
            setShowDbError(true)
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch dashboard stats:', error)
        // Check if error message contains database connection error indicators
        if (error.message && 
            (error.message.includes("Can't reach database") || 
             error.message.includes("P1001") || 
             error.message.includes("P1002") || 
             error.message.includes("P1017"))) {
          setDbConnectionError("Database connection error: Unable to connect to the database server.")
          setShowDbError(true)
        }
      }
    }

    // Only fetch stats for admin users
    if (isAdmin && session?.user?.id) {
      fetchStats()
      
      // Set up polling interval (5 minutes instead of 30 seconds to reduce load)
      const interval = setInterval(fetchStats, 300000) // 5 minutes
      
      return () => {
        clearInterval(interval)
      }
    }
  }, [isAdmin, session?.user?.id]) // More specific dependencies

  // Navigation items based on user role
  const baseAdminNavItems: NavigationItem[] = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { 
      href: "/dashboard/students", 
      label: "Students", 
      icon: Users, 
      badge: stats?.students?.total?.toString() || "0"
    },
    { 
      href: "/dashboard/events", 
      label: "Events", 
      icon: Calendar, 
      badge: stats?.events?.total?.toString() || "0"
    },
    { href: "/dashboard/evaluations", label: "Evaluations", icon: ClipboardCheck },
    { href: "/dashboard/certificates/templates", label: "Certificates", icon: Award },
    { 
      href: "/dashboard/fees", 
      label: "Fees", 
      icon: DollarSign, 
      badge: stats?.payments?.pending?.toString() || "0"
    },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
  ]

  // Add Users menu item only for ADMIN and COLLEGE_ORG
  const usersNavItem: NavigationItem[] = 
    session?.user?.role === 'ADMIN' || session?.user?.role === 'COLLEGE_ORG'
      ? [{ href: "/dashboard/users", label: "Users", icon: UserCog }]
      : []

  const adminNavItems: NavigationItem[] = [
    ...baseAdminNavItems,
    ...usersNavItem,
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]

  const studentNavItems: NavigationItem[] = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance/student", label: "My Attendance", icon: Calendar },
    { href: "/dashboard/fees/student", label: "My Fees", icon: DollarSign },
    { href: "/dashboard/certificates", label: "My Certificates", icon: FileText },
  ]

  const navItems = isAdmin ? adminNavItems : studentNavItems

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    return paths.map((path, index) => ({
      name: path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' '),
      href: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1
    }))
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Database Connection Error Alert */}
      {showDbError && dbConnectionError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 p-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800 font-medium">
                  {dbConnectionError}
                </p>
                <p className="text-xs text-red-700 hidden sm:block">
                  Some features may be unavailable. Please try again later.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-700 hover:text-red-900 hover:bg-red-100"
                onClick={() => setShowDbError(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header */}
      <header className={cn(
        "bg-white shadow-sm border-b backdrop-blur-sm bg-white/80 sticky z-50",
        showDbError && dbConnectionError ? "top-10" : "top-0"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EduManage Pro
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Student Management System</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search Button */}
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Search className="h-4 w-4" />
              </Button>
              
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  <span className="w-1 h-1 bg-white rounded-full"></span>
                </span>
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {session?.user?.role?.toLowerCase()}
                  </p>
                </div>
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {session?.user?.name?.charAt(0)}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                onClick={() => completeLogout()}
                title="Sign out everywhere"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <div className="pb-3 pt-1">
              <nav className="flex items-center space-x-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.href} className="flex items-center space-x-2">
                    {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                    <Link
                      href={crumb.href}
                      className={cn(
                        "transition-colors hover:text-gray-900",
                        crumb.isLast 
                          ? "text-gray-900 font-medium" 
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {crumb.name}
                    </Link>
                  </div>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity lg:hidden z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Enhanced Sidebar */}
        <aside className={cn(
          "fixed left-0 z-50 w-64 bg-white/95 backdrop-blur-md transform transition-all duration-300 ease-in-out border-r border-gray-200/60",
          showDbError && dbConnectionError ? "top-[6.5rem] bottom-0" : "top-16 bottom-0",
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0 lg:shadow-none"
        )}>
          <div className="h-full flex flex-col">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200/60 lg:hidden">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 overflow-y-auto py-4">
              <nav className="px-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || 
                    (pathname.startsWith(item.href) && item.href !== '/dashboard')
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out",
                        isActive
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-100/50"
                          : "text-gray-700 hover:bg-gray-50/80 hover:text-gray-900"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                          isActive 
                            ? "bg-blue-100 text-blue-600" 
                            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant={isActive ? "default" : "secondary"}
                          className={cn(
                            "text-xs h-5 px-2 font-semibold",
                            isActive 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "bg-gray-200 text-gray-700 group-hover:bg-gray-300"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* Quick Stats Section */}
              {isAdmin && stats && (
                <div className="mt-6 mx-3">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 rounded-lg p-3 border border-gray-200/50">
                    <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center uppercase tracking-wide">
                      <BarChart3 className="h-3 w-3 mr-2 text-gray-600" />
                      Quick Stats
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-700 font-medium">Active Students</span>
                        </div>
                        <span className="text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                          {stats.students.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-gray-700 font-medium">Total Events</span>
                        </div>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {stats.events.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span className="text-xs text-gray-700 font-medium">Pending Payments</span>
                        </div>
                        <span className="text-xs font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                          {stats.payments.pending}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

           {/* Sidebar Footer */}
            <div className="border-t border-gray-200/60 p-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                  Made with 
                  ❤️
                  by Khyle Amacna of 
                  AOG Tech
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Enhanced Main Content */}
        <main className="flex-1 min-w-0 lg:ml-64 p-4 lg:p-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 