"use client"

import { ReactNode } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  Settings, 
  LogOut,
  BarChart3,
  User
} from "lucide-react"

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const adminNavItems = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/events", label: "Events", icon: Calendar },
    { href: "/dashboard/attendance", label: "Attendance", icon: FileText },
    { href: "/dashboard/fees", label: "Fees", icon: DollarSign },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]

  const studentNavItems = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance", label: "My Attendance", icon: Calendar },
    { href: "/dashboard/fees", label: "My Fees", icon: DollarSign },
  ]

  const navItems = isAdmin ? adminNavItems : studentNavItems

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Student Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session?.user?.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar */}
          <aside className="w-full lg:w-56 flex-shrink-0">
            <Card className="p-4">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center space-x-3 text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </Card>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
} 