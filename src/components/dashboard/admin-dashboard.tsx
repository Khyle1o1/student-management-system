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
  Loader2,
  ClipboardCheck
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

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
  revenue: {
    total: number
    monthly: number
    growthPercent: number
  }
  payments: {
    pending: number
    unpaidPercent: number
  }
  recent: {
    students: Array<{
      id: string
      name: string
      studentId: string
      email: string
      createdAt: string
    }>
    payments: Array<{
      id: string
      amount: number
      status: string
      paymentDate: string
      student: {
        id: string
        name: string
        studentId: string
      }
      fee: {
        id: string
        name: string
      }
    }>
    events: Array<{
      id: string
      name: string
      date: string
      type: string
      status: string
    }>
  }
}

interface Activity {
  id: string
  type: string
  title: string
  description: string
  time: string
  status: string
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
    href: "/dashboard/attendance",
    label: "Manage Attendance",
    icon: ClipboardCheck,
    description: "Track event attendance",
    color: "bg-indigo-500 hover:bg-indigo-600"
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

function ActivityItem({ activity }: { activity: Activity }) {
  const getStatusIcon = () => {
    switch (activity.status?.toLowerCase()) {
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
    switch (activity.status?.toLowerCase()) {
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
            <p className="font-medium text-gray-900 text-sm">{activity.title || 'Untitled Activity'}</p>
            <p className="text-gray-600 text-sm">{activity.description || 'No description'}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">{activity.time || 'Unknown time'}</span>
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
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

        // Convert recent activities to activity format
        const recentActivities: Activity[] = [
          ...(data.recent?.students || []).map((student: any) => ({
            id: student.id,
            type: 'student',
            title: 'New Student Enrolled',
            description: `${student.name || 'Unknown'} (${student.studentId || 'No ID'})`,
            time: new Date(student.createdAt).toLocaleDateString(),
            status: 'success'
          })),
          ...(data.recent?.payments || []).map((payment: any) => ({
            id: payment.id,
            type: 'payment',
            title: `Payment ${payment.status || 'Unknown'}`,
            description: `${payment.student?.name || 'Unknown Student'} - ${payment.fee?.name || 'Unknown Fee'}`,
            time: new Date(payment.paymentDate).toLocaleDateString(),
            status: payment.status?.toLowerCase() === 'paid' ? 'success' : 'warning'
          })),
          ...(data.recent?.events || []).map((event: any) => ({
            id: event.id,
            type: 'event',
            title: event.name || 'Untitled Event',
            description: `${event.type || 'Unknown Type'} Event`,
            time: new Date(event.date).toLocaleDateString(),
            status: event.status?.toLowerCase() || 'pending'
          }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

        setActivities(recentActivities)
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-500">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className={`${action.color} text-white cursor-pointer transition-all duration-200 hover:shadow-lg`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {action.label}
                </CardTitle>
                <action.icon className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-90">{action.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats?.students.total || 0}
          icon={Users}
          growth={stats?.students.growthPercent || 0}
          growthLabel="this month"
          isLoading={loading}
        />
        <StatCard
          title="Active Events"
          value={stats?.events.total || 0}
          icon={Calendar}
          growth={stats?.events.growthPercent || 0}
          growthLabel="this month"
          isLoading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={stats?.revenue.total || 0}
          icon={DollarSign}
          growth={stats?.revenue.growthPercent || 0}
          growthLabel="vs last month"
          prefix="₱"
          isLoading={loading}
        />
        <StatCard
          title="Pending Payments"
          value={stats?.payments.pending || 0}
          icon={FileText}
          growth={stats?.payments.unpaidPercent || 0}
          growthLabel="unpaid"
          isLoading={loading}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No recent activity</p>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 