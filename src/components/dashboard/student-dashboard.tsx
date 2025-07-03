"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  BookOpen,
  Clock,
  CreditCard,
  User,
  AlertTriangle,
  Target,
  Award,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

interface StudentDashboardProps {
  studentId: string | null
}

interface StudentStats {
  attendanceRate: number
  totalEvents: number
  attendedEvents: number
  totalFees: number
  paidFees: number
  pendingFees: number
  paymentProgress: number
}

interface RecentAttendance {
  id: string
  status: string
  event: {
    title: string
    date: string
    type: string
  }
}

interface UpcomingEvent {
  id: string
  title: string
  date: string
  type: string
  priority: string
}

interface FeeStatus {
  id: string
  name: string
  amount: number
  status: string
  dueDate?: string
  category: string
}

export function StudentDashboard({ studentId }: StudentDashboardProps) {
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [feeStatus, setFeeStatus] = useState<FeeStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (studentId) {
      fetchDashboardData()
    }
  }, [studentId])

  const fetchDashboardData = async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      
      // Fetch student stats, attendance, fees in parallel
      const [statsRes, attendanceRes, feesRes] = await Promise.all([
        fetch(`/api/students/dashboard/${studentId}`),
        fetch(`/api/students/attendance/${studentId}`),
        fetch(`/api/students/fees/${studentId}`)
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
        setUpcomingEvents(statsData.upcomingEvents || [])
      }

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json()
        // Get the last 5 attendance records
        const recent = attendanceData.records.slice(0, 5).map((record: any) => ({
          id: record.id,
          status: record.status,
          event: {
            title: record.event.title,
            date: record.event.date,
            type: record.event.type
          }
        }))
        setRecentAttendance(recent)
      }

      if (feesRes.ok) {
        const feesData = await feesRes.json()
        // Convert fees to fee status format
        const feeStatusItems = feesData.fees.map((fee: any) => {
          const paymentsForFee = feesData.payments.filter((payment: any) => payment.fee.id === fee.id)
          const paidAmount = paymentsForFee
            .filter((payment: any) => payment.status === 'PAID')
            .reduce((sum: number, payment: any) => sum + payment.amount, 0)
          const hasPartialPayment = paymentsForFee.some((payment: any) => payment.status === 'PARTIAL')
          
          let status = "UNPAID"
          if (paidAmount >= fee.amount) status = "PAID"
          else if (paidAmount > 0 || hasPartialPayment) status = "PARTIAL"

          return {
            id: fee.id,
            name: fee.name,
            amount: fee.amount,
            status,
            dueDate: fee.dueDate,
            category: fee.type.toLowerCase().replace('_fee', '')
          }
        })
        setFeeStatus(feeStatusItems)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Unable to load dashboard data</p>
          <Button variant="outline" onClick={fetchDashboardData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back! 👋
          </h2>
          <p className="text-gray-600 mt-1">
            Track your academic progress and stay on top of your goals
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/dashboard/profile">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          icon={Calendar}
          progress={stats.attendanceRate}
          description={`${stats.attendedEvents} of ${stats.totalEvents} events attended`}
          color="blue"
        />
        <StatCard
          title="Payment Progress"
          value={`${stats.paymentProgress}%`}
          icon={DollarSign}
          progress={stats.paymentProgress}
          description={`₱${stats.paidFees.toLocaleString()} paid of ₱${stats.totalFees.toLocaleString()}`}
          color="green"
        />
        <StatCard
          title="Total Events"
          value={stats.totalEvents.toString()}
          icon={Award}
          description={`${stats.attendedEvents} attended • ${stats.totalEvents - stats.attendedEvents} missed`}
          color="purple"
        />
        <StatCard
          title="Pending Fees"
          value={`₱${stats.pendingFees.toLocaleString()}`}
          icon={Target}
          description={`${feeStatus.filter(f => f.status !== "PAID").length} fee(s) remaining`}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Attendance */}
        <Card className="xl:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Recent Attendance</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Last {recentAttendance.length} records
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAttendance.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No attendance records yet</p>
              </div>
            ) : (
              recentAttendance.map((record) => (
                <AttendanceItem key={record.id} record={record} />
              ))
            )}
            <Link href="/dashboard/attendance/student">
              <Button variant="ghost" className="w-full text-sm text-gray-600 hover:text-gray-900">
                View full attendance history
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>Upcoming</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No upcoming events</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                    <Badge 
                      variant={event.priority === "high" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {event.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">{event.type}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fee Status */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>Fee Status</span>
            </div>
            <Link href="/dashboard/fees/student">
              <Button variant="outline" size="sm">
                View All Fees
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {feeStatus.slice(0, 6).map((fee) => (
              <FeeItem key={fee.id} fee={fee} />
            ))}
          </div>
          {feeStatus.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No fees assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/profile">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex flex-col items-start space-y-1">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Update Profile</span>
                  <span className="text-xs text-gray-500">Manage your information</span>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/attendance/student">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex flex-col items-start space-y-1">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">View Attendance</span>
                  <span className="text-xs text-gray-500">Check your records</span>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/fees/student">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex flex-col items-start space-y-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">View Fees</span>
                  <span className="text-xs text-gray-500">Check payment status</span>
                </div>
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start h-auto p-4" disabled>
              <div className="flex flex-col items-start space-y-1">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">Course Materials</span>
                <span className="text-xs text-gray-500">Coming soon</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper Components
interface StatCardProps {
  title: string
  value: string
  icon: any
  progress?: number
  description: string
  color: "blue" | "green" | "purple" | "orange"
}

function StatCard({ title, value, icon: Icon, progress, description, color }: StatCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600",
    green: "from-green-500 to-green-600 text-green-600", 
    purple: "from-purple-500 to-purple-600 text-purple-600",
    orange: "from-orange-500 to-orange-600 text-orange-600"
  }

  return (
    <Card className="relative overflow-hidden border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${colorClasses[color]} transition-all duration-500`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AttendanceItem({ record }: { record: RecentAttendance }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "ABSENT": return <XCircle className="h-4 w-4 text-red-600" />
      case "LATE": return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-800"
      case "ABSENT": return "bg-red-100 text-red-800"
      case "LATE": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        {getStatusIcon(record.status)}
        <div>
          <p className="text-sm font-medium text-gray-900">{record.event.title}</p>
          <p className="text-xs text-gray-500">
            {new Date(record.event.date).toLocaleDateString()} • {record.event.type}
          </p>
        </div>
      </div>
      <Badge className={getStatusColor(record.status)}>
        {record.status}
      </Badge>
    </div>
  )
}

function FeeItem({ fee }: { fee: FeeStatus }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID": return "bg-green-100 text-green-800"
      case "PARTIAL": return "bg-yellow-100 text-yellow-800"
      case "UNPAID": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{fee.name}</h4>
        <Badge className={getStatusColor(fee.status)}>
          {fee.status}
        </Badge>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-600">₱{fee.amount.toLocaleString()}</p>
        {fee.dueDate && (
          <p className="text-xs text-gray-500">
            Due: {new Date(fee.dueDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
} 