"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Users, 
  Calendar, 
  CreditCard, 
  FileText, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  UserPlus,
  CalendarPlus,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Loader2,
  ClipboardCheck,
  Mail,
  GraduationCap,
  MapPin,
  DollarSign,
  User
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
    activities: Array<{
      id: string
      message: string
      created_at: string
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
  timestamp: number
  studentId?: string
  feeId?: string
  // Store original data for modal display
  originalData?: any
}


function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  growth, 
  growthLabel,
  prefix = "",
  suffix = "",
  isLoading = false,
  href
}: {
  title: string
  value: number
  icon: any
  growth: number
  growthLabel: string
  prefix?: string
  suffix?: string
  isLoading?: boolean
  href?: string
}) {
  const isPositive = growth > 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  const cardContent = (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border-slate-200 ${href ? 'cursor-pointer hover:border-blue-300' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-gray-400">Loading...</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900">
              {prefix}{value.toLocaleString()}{suffix}
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(growth)}% {growthLabel}
              </span>
            </div>
          </>
        )}
      </CardContent>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-6 translate-x-6"></div>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

function ActivityItem({ activity, onClick }: { activity: Activity; onClick: () => void }) {
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
    <div 
      className={`p-3 border-l-4 rounded-r-lg transition-all duration-200 ${getStatusColor()} cursor-pointer hover:shadow-md hover:scale-[1.01]`}
      onClick={onClick}
    >
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
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [activityDetails, setActivityDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

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

        // Convert recent items and sort by true timestamps (newest first)
        const recentActivities: Activity[] = [
          ...(data.recent?.students || []).map((student: any) => {
            const ts = Date.parse(student.createdAt)
            return {
              id: student.id,
              type: 'student',
              title: 'New Student Enrolled',
              description: `${student.name || 'Unknown'} (${student.studentId || 'No ID'})`,
              time: isNaN(ts) ? 'Invalid Date' : new Date(ts).toLocaleString(),
              status: 'success',
              timestamp: isNaN(ts) ? 0 : ts,
              originalData: student, // Store original data for modal
            }
          }),
          ...(data.recent?.payments || []).map((payment: any) => {
            const ts = Date.parse(payment.paymentDate)
            return {
              id: payment.id,
              type: 'payment',
              title: `Payment ${payment.status || 'Unknown'}`,
              description: `${payment.student?.name || 'Unknown Student'} - ${payment.fee?.name || 'Unknown Fee'}`,
              time: isNaN(ts) ? 'Invalid Date' : new Date(ts).toLocaleString(),
              status: payment.status?.toLowerCase() === 'paid' ? 'success' : 'warning',
              timestamp: isNaN(ts) ? 0 : ts,
              studentId: payment.student?.id,
              feeId: payment.fee?.id,
              originalData: payment, // Store original data for modal
            }
          }),
          ...(data.recent?.events || []).map((event: any) => {
            const ts = Date.parse(event.date)
            return {
              id: event.id,
              type: 'event',
              title: event.name || 'Untitled Event',
              description: `${event.type || 'Unknown Type'} Event`,
              time: isNaN(ts) ? 'Invalid Date' : new Date(ts).toLocaleString(),
              status: (event.status?.toLowerCase() || 'pending'),
              timestamp: isNaN(ts) ? 0 : ts,
              originalData: event, // Store original data for modal
            }
          }),
          ...(data.recent?.activities || []).map((log: any) => {
            const ts = Date.parse(log.created_at)
            return {
              id: log.id,
              type: 'system',
              title: 'System Activity',
              description: log.message || 'Activity occurred',
              time: isNaN(ts) ? 'Invalid Date' : new Date(ts).toLocaleString(),
              status: 'success',
              timestamp: isNaN(ts) ? 0 : ts,
              originalData: log, // Store original data for modal
            }
          })
        ].sort((a, b) => b.timestamp - a.timestamp)

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

  const fetchActivityDetails = async (activity: Activity) => {
    setLoadingDetails(true)
    try {
      let response
      switch (activity.type) {
        case 'student':
          response = await fetch(`/api/students/${activity.id}`)
          break
        case 'event':
          response = await fetch(`/api/events/${activity.id}`)
          break
        case 'payment':
          // For payments, we might need a different endpoint or use the original data
          // For now, we'll use the original data stored in the activity
          setActivityDetails(activity.originalData)
          setLoadingDetails(false)
          return
        case 'system':
          // System activities might not have a detail endpoint
          setActivityDetails(activity.originalData)
          setLoadingDetails(false)
          return
        default:
          setActivityDetails(activity.originalData)
          setLoadingDetails(false)
          return
      }

      if (response && response.ok) {
        const data = await response.json()
        setActivityDetails(data)
      } else {
        // Fallback to original data if API fails
        setActivityDetails(activity.originalData)
      }
    } catch (error) {
      console.error('Error fetching activity details:', error)
      // Fallback to original data on error
      setActivityDetails(activity.originalData)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity)
    fetchActivityDetails(activity)
  }

  const closeModal = () => {
    setSelectedActivity(null)
    setActivityDetails(null)
  }

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
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Students"
          value={stats?.students.total || 0}
          icon={Users}
          growth={stats?.students.growthPercent || 0}
          growthLabel="this month"
          isLoading={loading}
          href="/dashboard/students"
        />
        <StatCard
          title="Total Number of Events"
          value={stats?.events.total || 0}
          icon={Calendar}
          growth={stats?.events.growthPercent || 0}
          growthLabel="this month"
          isLoading={loading}
          href="/dashboard/events"
        />
        <StatCard
          title="Total Collected Fees"
          value={stats?.revenue.total || 0}
          icon={CreditCard}
          growth={stats?.revenue.growthPercent || 0}
          growthLabel="vs last month"
          prefix="₱"
          isLoading={loading}
          href="/dashboard/fees"
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
                <ActivityItem 
                  key={activity.id} 
                  activity={activity} 
                  onClick={() => handleActivityClick(activity)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Details Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedActivity?.title || 'Activity Details'}</DialogTitle>
            <DialogDescription>
              View detailed information about this activity
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading details...</span>
            </div>
          ) : activityDetails ? (
            <div className="space-y-4">
              {selectedActivity?.type === 'student' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Student Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Name</p>
                          <p className="text-sm">{activityDetails.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Student ID</p>
                          <p className="text-sm">{activityDetails.student_id || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Email</p>
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {activityDetails.email || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">College</p>
                          <p className="text-sm flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {activityDetails.college || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Course</p>
                          <p className="text-sm">{activityDetails.course || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Year Level</p>
                          <p className="text-sm">Year {activityDetails.year_level || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-gray-500">Enrolled Date</p>
                        <p className="text-sm flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {selectedActivity?.time || 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedActivity?.type === 'event' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Event Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Event Name</p>
                        <p className="text-sm font-semibold">{activityDetails.title || activityDetails.name || 'N/A'}</p>
                      </div>
                      {activityDetails.description && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Description</p>
                          <p className="text-sm">{activityDetails.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {activityDetails.date ? new Date(activityDetails.date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Type</p>
                          <Badge variant="secondary">{activityDetails.type || 'N/A'}</Badge>
                        </div>
                        {activityDetails.location && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Location</p>
                            <p className="text-sm flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {activityDetails.location}
                            </p>
                          </div>
                        )}
                        {activityDetails.start_time && activityDetails.end_time && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Time</p>
                            <p className="text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activityDetails.start_time} - {activityDetails.end_time}
                            </p>
                          </div>
                        )}
                        {activityDetails.attendance_type && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Attendance Type</p>
                            <Badge variant={activityDetails.attendance_type === 'IN_OUT' ? 'default' : 'secondary'}>
                              {activityDetails.attendance_type === 'IN_OUT' ? 'In & Out' : 'In only'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <Badge 
                          className={
                            activityDetails.status?.toLowerCase() === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : activityDetails.status?.toLowerCase() === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {activityDetails.status || 'N/A'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedActivity?.type === 'payment' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Amount</p>
                          <p className="text-sm font-semibold flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ₱{activityDetails.amount?.toLocaleString() || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <Badge 
                            className={
                              activityDetails.status?.toLowerCase() === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {activityDetails.status || 'N/A'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Student</p>
                          <p className="text-sm">{activityDetails.student?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{activityDetails.student?.studentId || ''}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Fee</p>
                          <p className="text-sm">{activityDetails.fee?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Payment Date</p>
                          <p className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {selectedActivity?.time || 'N/A'}
                          </p>
                        </div>
                        {activityDetails.payment_method && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Payment Method</p>
                            <p className="text-sm">{activityDetails.payment_method}</p>
                          </div>
                        )}
                        {activityDetails.reference && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Reference Number</p>
                            <p className="text-sm font-mono">{activityDetails.reference}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedActivity?.type === 'system' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        System Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Message</p>
                        <p className="text-sm">{activityDetails.message || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Timestamp</p>
                        <p className="text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {selectedActivity?.time || 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No details available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 