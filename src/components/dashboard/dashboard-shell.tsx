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
  CreditCard, 
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
  UserCog,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { completeLogout } from "@/lib/google-oauth-utils"
import NotificationBell from "@/components/notifications/NotificationBell"
import { AdminHeader } from "./admin-header"

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
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === 'COLLEGE_ORG' || session?.user?.role === 'COURSE_ORG'
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

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

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
    { href: "/dashboard/forms", label: "Forms & Evaluations", icon: ClipboardCheck },
    { href: "/dashboard/certificates/templates", label: "Certificates", icon: Award },
    { 
      href: "/dashboard/fees", 
      label: "Fees", 
      icon: CreditCard
    },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
  ]

  // Add Users menu item only for ADMIN
  const usersNavItem: NavigationItem[] = 
    session?.user?.role === 'ADMIN'
      ? [{ href: "/dashboard/users", label: "Users", icon: UserCog }]
      : []

  const adminNavItems: NavigationItem[] = [
    // Curated student-style navigation for admin
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { 
      href: "/dashboard/students", 
      label: "Students", 
      icon: Users, 
      badge: stats?.students?.total?.toString() || "0"
    },
    { href: "/dashboard/events", label: "Events", icon: Calendar },
    { href: "/dashboard/certificates/templates", label: "Certificates", icon: Award },
    { href: "/dashboard/forms", label: "Evaluations", icon: ClipboardCheck },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/fees", label: "Fees", icon: CreditCard },
    ...usersNavItem,
    { href: "/dashboard/settings", label: "Settings", icon: Settings }
  ]

  const studentNavItems: NavigationItem[] = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance/student", label: "My Attendance", icon: Calendar },
    { href: "/dashboard/fees/student", label: "My Fees", icon: CreditCard },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
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

      

      <div className="flex">
        {/* Mobile Sidebar Backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity lg:hidden z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Enhanced Sidebar - curved student-style */}
        <aside className={cn(
          "fixed left-0 z-50 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transform transition-all duration-300 ease-in-out border-r border-gray-200/60 dark:border-slate-800/60",
          "top-0 bottom-0",
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0 lg:shadow-none",
        )}>
          <div className="h-full flex flex-col rounded-r-3xl lg:rounded-r-[28px] shadow-sm bg-gradient-to-b from-[#EEF2FF] to-white dark:from-slate-950 dark:to-slate-900 transition-colors">
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
            <div className="flex-1 overflow-y-auto no-scrollbar py-4">
              <nav className="px-4 space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || 
                    (pathname.startsWith(item.href) && item.href !== '/dashboard')
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out",
                        isActive
                          ? "bg-white dark:bg-slate-800 text-[#1E293B] dark:text-white shadow-md border border-blue-100/60 dark:border-slate-700"
                          : "text-gray-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-white hover:shadow-sm"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                          isActive 
                            ? "bg-blue-100 text-blue-600 ring-1 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-800" 
                            : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-700 group-hover:text-gray-700 dark:group-hover:text-white"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant={isActive ? "default" : "secondary"}
                          className={cn(
                            "text-xs h-6 px-2.5 font-semibold rounded-full",
                            isActive 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 group-hover:bg-gray-300 dark:group-hover:bg-slate-600"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}

                {/* Logout */}
                <button
                  onClick={() => completeLogout()}
                  className="mt-2 w-full group flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out text-gray-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-white hover:shadow-sm"
                  title="Sign out everywhere"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-700 group-hover:text-gray-700 dark:group-hover:text-white transition-all duration-300">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Logout</span>
                  </div>
                </button>
              </nav>

              {/* Quick Stats Section */}
              {isAdmin && stats && (
                <div className="mt-6 mx-4">
                  <div className="bg-gradient-to-br from-white to-[#EEF2FF] dark:from-slate-900 dark:to-slate-800 rounded-2xl p-4 border border-gray-200/50 dark:border-slate-700 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center uppercase tracking-wide">
                      <BarChart3 className="h-3 w-3 mr-2 text-gray-600 dark:text-slate-300" />
                      Quick Stats
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">Active Students</span>
                        </div>
                        <span className="text-xs font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 px-1.5 py-0.5 rounded">
                          {stats.students.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">Total Events</span>
                        </div>
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                          {stats.events.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">Pending Payments</span>
                        </div>
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/40 px-1.5 py-0.5 rounded">
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
          {!isAdmin && (
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-xl"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Top Header (Admin only) aligned with content */}
          {isAdmin && (
            <div className="max-w-6xl mx-auto lg:ml-12 mb-4">
              <AdminHeader onToggleSidebar={() => setIsMobileMenuOpen(true)} />
            </div>
          )}

          <div className="max-w-6xl mx-auto lg:ml-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-visible transition-colors">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 

