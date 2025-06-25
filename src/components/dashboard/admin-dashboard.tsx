"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  UserPlus,
  CalendarPlus,
  CreditCard,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

interface DashboardStats {
  totalStudents: number
  studentGrowth: number
  totalEvents: number
  eventGrowth: number
  upcomingEvents: number
  totalRevenue: number
  revenueGrowth: number
  pendingPayments: number
  totalFees: number
  activities: Array<{
    id: string
    type: string
    title: string
    description: string
    time: string
    status: string
  }>
}

const quickActions = [
  {
    href: "/dashboard/students/new",
    label: "Add Student",
    icon: UserPlus,
    description: "Enroll a new student",
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    href: "/dashboard/events/new",
    label: "Create Event",
    icon: CalendarPlus,
    description: "Schedule new event",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    href: "/dashboard/fees/new",
    label: "Add Fee",
    icon: CreditCard,
    description: "Create fee structure",
    color: "bg-purple-500 hover:bg-purple-600"
  },
  {
    href: "/dashboard/reports",
    label: "Generate Report",
    icon: BarChart3,
    description: "Create analytics report",
    color: "bg-orange-500 hover:bg-orange-600"
  },
]

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  growth, 
  growthLabel,
  prefix = "",
  suffix = "",
  isLoading = false
}: {
  title: string
  value: number
  icon: any
  growth: number
  growthLabel: string
  prefix?: string
  suffix?: string
  isLoading?: boolean
}) {
  const isPositive = growth > 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            {title}
          </CardTitle>
          <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
            <Icon className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-gray-400">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {prefix}{value.toLocaleString()}{suffix}
        </div>
        <div className="flex items-center space-x-1 mt-1">
          <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
          <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(growth)}% {growthLabel}
          </span>
        </div>
      </CardContent>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-6 translate-x-6"></div>
    </Card>
  )
}

function ActivityItem({ activity }: { activity: DashboardStats['activities'][0] }) {
  const getStatusIcon = () => {
    switch (activity.status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = () => {
    switch (activity.status) {
      case "success":
        return "border-l-green-400 bg-green-50"
      case "warning":
        return "border-l-yellow-400 bg-yellow-50"
      case "error":
        return "border-l-red-400 bg-red-50"
      default:
        return "border-l-blue-400 bg-blue-50"
    }
  }

  return (
    <div className={`p-3 border-l-4 rounded-r-lg ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
            <p className="text-gray-600 text-sm">{activity.description}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">{activity.time}</span>
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-600">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Overview of your student management system
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          icon={Users}
          growth={stats?.studentGrowth || 0}
          growthLabel="from last month"
          isLoading={loading}
        />
        <StatCard
          title="Active Events"
          value={stats?.totalEvents || 0}
          icon={Calendar}
          growth={stats?.eventGrowth || 0}
          growthLabel="new this month"
          isLoading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={stats?.totalRevenue || 0}
          icon={DollarSign}
          growth={stats?.revenueGrowth || 0}
          growthLabel="from last month"
          prefix="₱"
          isLoading={loading}
        />
        <StatCard
          title="Pending Payments"
          value={stats?.pendingPayments || 0}
          icon={FileText}
          growth={0}
          growthLabel="unpaid fees"
          isLoading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enhanced Quick Actions */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-blue-600" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <Card className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 hover:border-blue-300">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${action.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{action.label}</h4>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Recent Activities</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 border-l-4 border-l-gray-200 bg-gray-50 rounded-r-lg">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <div className="space-y-1">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.activities && stats.activities.length > 0 ? (
              <>
                {stats.activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
                <Button variant="ghost" className="w-full text-sm text-gray-600 hover:text-gray-900">
                  View all activities
                </Button>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No recent activities</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>System Overview</span>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              System Online
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Total Students</h4>
              <p className="text-2xl font-bold text-blue-600">{stats?.totalStudents || 0}</p>
              <p className="text-sm text-blue-600">Enrolled</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900">Upcoming Events</h4>
              <p className="text-2xl font-bold text-green-600">{stats?.upcomingEvents || 0}</p>
              <p className="text-sm text-green-600">Scheduled</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900">Active Fees</h4>
              <p className="text-2xl font-bold text-orange-600">{stats?.totalFees || 0}</p>
              <p className="text-sm text-orange-600">Structures</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 