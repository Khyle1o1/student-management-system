"use client"

import { ReactNode, useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
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
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  children: ReactNode
}

interface DashboardStats {
  totalStudents: number
  totalEvents: number
  pendingPayments: number
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isAdmin = session?.user?.role === "ADMIN"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      }
    }

    if (isAdmin) {
      fetchStats()
    }
  }, [isAdmin])

  const adminNavItems = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { 
      href: "/dashboard/students", 
      label: "Students", 
      icon: Users, 
      badge: stats?.totalStudents?.toString() || "0"
    },
    { 
      href: "/dashboard/events", 
      label: "Events", 
      icon: Calendar, 
      badge: stats?.totalEvents?.toString() || "0"
    },
    { href: "/dashboard/attendance", label: "Attendance", icon: FileText },
    { 
      href: "/dashboard/fees", 
      label: "Fees", 
      icon: DollarSign, 
      badge: stats?.pendingPayments?.toString() || "0"
    },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]

  const studentNavItems = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance", label: "My Attendance", icon: Calendar },
    { href: "/dashboard/fees", label: "My Fees", icon: DollarSign, badge: "2" },
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
      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b backdrop-blur-sm bg-white/80 sticky top-0 z-50">
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
                onClick={() => signOut()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Enhanced Sidebar */}
          <aside className={cn(
            "w-full lg:w-64 flex-shrink-0 transition-all duration-300",
            isMobileMenuOpen ? "block" : "hidden lg:block"
          )}>
            <Card className="p-2 shadow-sm border-slate-200">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || 
                    (pathname.startsWith(item.href) && item.href !== '/dashboard')
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-all duration-200 group",
                        isActive
                          ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={cn(
                          "h-5 w-5 transition-colors",
                          isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                        )} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant={isActive ? "default" : "secondary"}
                          className="text-xs h-5 px-2"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* Quick Stats in Sidebar */}
              {isAdmin && stats && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Quick Stats
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Students</span>
                      <span className="font-medium text-green-600">{stats.totalStudents}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Events</span>
                      <span className="font-medium text-blue-600">{stats.totalEvents}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending Payments</span>
                      <span className="font-medium text-orange-600">{stats.pendingPayments}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </aside>

          {/* Enhanced Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
} 