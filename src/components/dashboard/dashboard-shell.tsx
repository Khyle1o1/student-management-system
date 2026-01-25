"use client"

import { ReactNode, useState, useEffect, createContext, useContext } from "react"
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
  Clock,
  Mail,
  Trophy
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { completeLogout } from "@/lib/google-oauth-utils"
import NotificationBell from "@/components/notifications/NotificationBell"
import { AdminHeader } from "./admin-header"
import { getOrgAccessLevelFromSession, hasOrgModuleAccess } from "@/lib/org-permissions"
import { useMaintenanceCheck } from "@/hooks/use-maintenance-check"

interface DashboardShellProps {
  children: ReactNode
}

interface SystemSettings {
  deletion_lock: boolean
  maintenance_mode: boolean
}

export const SystemSettingsContext = createContext<SystemSettings | null>(null)

export function useSystemSettings() {
  return useContext(SystemSettingsContext)
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
  const userRole = session?.user?.role
  const orgAccessLevel = getOrgAccessLevelFromSession(session as any)
  const isSystemAdmin = userRole === "ADMIN"
  const isAdmin = userRole === "ADMIN" || userRole === 'EVENTS_STAFF' || userRole === 'INTRAMURALS_STAFF' || userRole === 'COLLEGE_ORG' || userRole === 'COURSE_ORG'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [dbConnectionError, setDbConnectionError] = useState<string | null>(null)
  const [showDbError, setShowDbError] = useState(false)
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)

  // Check maintenance mode and redirect if necessary
  useMaintenanceCheck()

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

  // Load global system settings (SYSTEM ADMIN dashboard only)
  useEffect(() => {
    const fetchSystemSettings = async () => {
      if (!isSystemAdmin) return

      try {
        const response = await fetch("/api/system-settings", { cache: "no-store" })
        if (response.ok) {
          const data = await response.json()
          setSystemSettings({
            deletion_lock: !!data.settings?.deletion_lock,
            maintenance_mode: !!data.settings?.maintenance_mode,
          })
        }
      } catch (error) {
        console.error("Failed to fetch system settings:", error)
      }
    }

    fetchSystemSettings()
  }, [isSystemAdmin])

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
  { href: "/dashboard/feedback", label: "Feedback", icon: Mail },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
  ]

  // Add Users menu item for ADMIN only
  const usersNavItem: NavigationItem[] = 
    userRole === 'ADMIN'
      ? [{ href: "/dashboard/users", label: "Users", icon: UserCog }]
      : []

  const showSettingsNavItem = userRole === 'ADMIN'

  // Role-based navigation configuration
  let adminNavItems: NavigationItem[] = []

  if (userRole === 'ADMIN') {
    // Admin has full access to all pages
    adminNavItems = [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { 
        href: "/dashboard/students", 
        label: "Students", 
        icon: Users, 
        badge: stats?.students?.total?.toString() || "0"
      },
      { href: "/dashboard/events", label: "Events", icon: Calendar },
      { href: "/dashboard/attendance/student", label: "Attendance", icon: ClipboardCheck },
      { href: "/dashboard/certificates/templates", label: "Certificates", icon: Award },
      { href: "/dashboard/forms", label: "Evaluations", icon: FileText },
      { href: "/dashboard/fees", label: "Fees", icon: CreditCard },
      { href: "/dashboard/feedback", label: "Feedback", icon: Mail },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
      { href: "/dashboard/intramurals", label: "Intramurals", icon: Trophy },
      ...usersNavItem,
      ...(showSettingsNavItem ? [{ href: "/dashboard/settings", label: "Settings", icon: Settings }] : [])
    ]
  } else if (userRole === 'EVENTS_STAFF') {
    // Events Staff: Limited to events, certificates, evaluations
    adminNavItems = [
      { href: "/dashboard/events", label: "Events", icon: Calendar },
      { href: "/dashboard/certificates/templates", label: "Certificates", icon: Award },
      { href: "/dashboard/forms", label: "Evaluations", icon: FileText },
    ]
  } else if (userRole === 'INTRAMURALS_STAFF') {
    // Intramurals Staff: Limited to intramurals only
    adminNavItems = [
      { href: "/dashboard/intramurals", label: "Intramurals", icon: Trophy },
    ]
  } else if (userRole === 'COLLEGE_ORG') {
    // College Organization (with org_access_level filtering)
    const fullCollegeNavItems: NavigationItem[] = [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { 
        href: "/dashboard/students", 
        label: "Students", 
        icon: Users, 
        badge: stats?.students?.total?.toString() || "0"
      },
      { href: "/dashboard/events", label: "Events", icon: Calendar },
      { href: "/dashboard/fees", label: "Fees", icon: CreditCard },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
    ]
    
    if (orgAccessLevel === "finance") {
      // Finance: Dashboard + Students + Fees + Reports
      adminNavItems = fullCollegeNavItems.filter((item) =>
        ["/dashboard", "/dashboard/students", "/dashboard/fees", "/dashboard/reports"].includes(item.href)
      )
    } else if (orgAccessLevel === "event") {
      // Event: Dashboard + Events
      adminNavItems = fullCollegeNavItems.filter((item) =>
        ["/dashboard", "/dashboard/events"].includes(item.href)
      )
    } else {
      // college (full org access)
      adminNavItems = fullCollegeNavItems
    }
  } else if (userRole === 'COURSE_ORG') {
    // Course Organization
    adminNavItems = [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { 
        href: "/dashboard/students", 
        label: "Students", 
        icon: Users, 
        badge: stats?.students?.total?.toString() || "0"
      },
      { href: "/dashboard/events", label: "Events", icon: Calendar },
      { href: "/dashboard/fees", label: "Fees", icon: CreditCard },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
    ]
  }

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
          "fixed left-0 z-50 w-72 transform transition-all duration-300 ease-in-out",
          "top-0 bottom-0 overflow-hidden",
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0 lg:shadow-none",
        )}>
          <div className="h-full flex flex-col rounded-r-3xl lg:rounded-r-[28px] shadow-sm bg-gradient-to-b from-[#191970] to-[#0f1349] transition-colors border-r border-[#191970]/80 overflow-hidden">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 lg:hidden">
              <h2 className="text-lg font-semibold text-white">Navigation</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-8 w-8 p-0 text-white hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-3">
              <nav className="px-2 space-y-.5 relative">
                {navItems.map((item, index) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || 
                    (pathname.startsWith(item.href) && item.href !== '/dashboard')
                  
                  return (
                    <div key={item.href} className="relative">
                      {/* White vertical line indicator for active item */}
                      {isActive && (
                        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-white rounded-r-full z-20"></div>
                      )}
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out",
                          isActive
                            ? "bg-white text-[#191970] shadow-lg"
                            : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-sm"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-nav-item={item.href}
                        data-nav-index={index}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                            isActive 
                              ? "bg-[#191970] text-white" 
                              : "bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white"
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
                                ? "bg-[#191970] text-white shadow-sm" 
                                : "bg-white/20 text-white group-hover:bg-white/30"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </div>
                  )
                })}

                {/* Logout */}
                <button
                  onClick={() => completeLogout()}
                  className="mt-2 w-full group flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out text-white/80 hover:bg-white/10 hover:text-white hover:shadow-sm"
                  title="Sign out everywhere"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white transition-all duration-300">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Logout</span>
                  </div>
                </button>
              </nav>

              {/* Quick Stats Section */}
              {isAdmin && stats && (
                <div className="mt-6 mx-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm">
                    <h4 className="text-xs font-bold text-white mb-3 flex items-center uppercase tracking-wide">
                      <BarChart3 className="h-3 w-3 mr-2 text-white/80" />
                      Quick Stats
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-xs text-white/90 font-medium">Active Students</span>
                        </div>
                        <span className="text-xs font-bold text-green-100 bg-green-500/30 px-1.5 py-0.5 rounded">
                          {stats.students.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="text-xs text-white/90 font-medium">Total Events</span>
                        </div>
                        <span className="text-xs font-bold text-blue-100 bg-blue-500/30 px-1.5 py-0.5 rounded">
                          {stats.events.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          <span className="text-xs text-white/90 font-medium">Pending Payments</span>
                        </div>
                        <span className="text-xs font-bold text-orange-100 bg-orange-500/30 px-1.5 py-0.5 rounded">
                          {stats.payments.pending}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

           {/* Sidebar Footer */}
            <div className="border-t border-white/10 p-3">
              <div className="text-center">
                <p className="text-xs text-white/60 flex items-center justify-center gap-1">
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
          {/* Top Header for both Admin and Student */}
          {isAdmin ? (
            <div className="max-w-6xl mx-auto lg:ml-12 mb-4">
              <AdminHeader onToggleSidebar={() => setIsMobileMenuOpen(true)} />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto mb-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="lg:hidden rounded-xl border-[#191970]/20 hover:border-[#191970]/40"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Toggle navigation menu"
                      >
                        <Menu className="h-5 w-5" />
                      </Button>
                      <div>
                        <h1 className="text-xl font-bold text-[#191970]">SmartU</h1>
                        <p className="text-xs text-[#191970]/70 hidden sm:block">Smart Solutions for a Smarter BukSU</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="hidden sm:flex text-[#191970]/70 hover:text-[#191970]">
                        <Search className="h-4 w-4" />
                      </Button>

                      <NotificationBell />

                      <Separator orientation="vertical" className="h-6 bg-[#191970]/10" />

                      <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                          <p className="text-sm font-medium text-[#191970]">
                            {session?.user?.name}
                          </p>
                          <p className="text-xs text-[#191970]/60 capitalize">
                            Student
                          </p>
                        </div>
                        <div className="h-8 w-8 bg-gradient-to-r from-[#191970] to-[#191970]/80 rounded-full flex items-center justify-center text-white text-sm font-medium shadow">
                          {session?.user?.name?.charAt(0)}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-[#191970]/70 hover:text-[#191970]"
                        onClick={() => completeLogout()}
                        title="Sign out everywhere"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign out</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SystemSettingsContext.Provider value={systemSettings}>
            <div className="max-w-6xl mx-auto lg:ml-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-visible transition-colors">
              <div className="p-4 lg:p-6">
                {children}
              </div>
            </div>
          </SystemSettingsContext.Provider>
        </main>
      </div>
    </div>
  )
} 

