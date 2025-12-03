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
  ChevronLeft,
  ChevronRight,
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
import { useState, useEffect, useMemo } from "react"
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfDay, addDays, format } from "date-fns"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

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

interface CalendarEntry {
  id: string
  type: 'event' | 'fee' | 'evaluation'
  title: string
  date: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  amount?: number | null
  status?: string | null
}

const calendarTypeConfig: Record<CalendarEntry['type'], { label: string; dot: string; pill: string; text: string }> = {
  event: {
    label: 'Upcoming event',
    dot: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-700',
    text: 'text-blue-600',
  },
  evaluation: {
    label: 'Evaluation deadline',
    dot: 'bg-amber-500',
    pill: 'bg-amber-100 text-amber-700',
    text: 'text-amber-600',
  },
  fee: {
    label: 'Fee due date',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-600',
  },
}

const parseDateValue = (value: string): Date => {
  const parsed = new Date(value)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  const alt = new Date(`${value}T00:00:00`)
  if (!isNaN(alt.getTime())) {
    return alt
  }
  return new Date()
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
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${href ? 'cursor-pointer hover:border-blue-300 dark:hover:border-slate-600' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {title}
        </CardTitle>
        <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-lg">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
            <span className="text-gray-400 dark:text-gray-500">Loading...</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {prefix}{value.toLocaleString()}{suffix}
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
        return "border-l-green-400 bg-green-50 dark:bg-green-900/40"
      case "warning":
        return "border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/30"
      case "error":
        return "border-l-red-400 bg-red-50 dark:bg-red-900/40"
      default:
        return "border-l-blue-400 bg-blue-50 dark:bg-blue-900/40"
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
            <p className="font-medium text-gray-900 dark:text-white text-sm">{activity.title || 'Untitled Activity'}</p>
            <p className="text-gray-600 dark:text-slate-300 text-sm">{activity.description || 'No description'}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400">{activity.time || 'Unknown time'}</span>
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
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([])
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const handlePrevMonth = () => setCalendarMonth((prev) => subMonths(prev, 1))
  const handleNextMonth = () => setCalendarMonth((prev) => addMonths(prev, 1))
  const [downloadingTimeline, setDownloadingTimeline] = useState(false)

  useEffect(() => {
    const fetchStatsAndActivities = async () => {
      try {
        setLoading(true)

        // 1) Dashboard summary stats (unchanged)
        const statsResponse = await fetch('/api/dashboard/stats')
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }
        const statsData = await statsResponse.json()
        setStats(statsData)

        // 2) Activity timeline based on dedicated activity_logs table
        const logsResponse = await fetch(`/api/activity-logs?limit=50&page=1`)
        if (logsResponse.ok) {
          const logsData = await logsResponse.json()
          const logs = logsData.logs || []

          const mappedActivities: Activity[] = logs.map((log: any) => {
            const ts = Date.parse(log.created_at)
            const actor = log.user_name || 'System'
            const role = log.role || ''
            const scopeLine = log.target_name
              ? `${log.module || 'system'} • ${log.target_type || ''} • ${log.target_name}`
              : `${log.module || 'system'} • ${log.target_type || ''}`

            return {
              id: log.id,
              type: 'system',
              title: log.action || 'System Activity',
              description: `${scopeLine}\nby ${actor}${role ? ` (${role})` : ''}`,
              time: isNaN(ts) ? 'Invalid Date' : new Date(ts).toLocaleString(),
              status: 'success',
              timestamp: isNaN(ts) ? 0 : ts,
              originalData: log,
            }
          }).sort((a: Activity, b: Activity) => b.timestamp - a.timestamp)

          setActivities(mappedActivities)
        } else {
          setActivities([])
        }
      } catch (error) {
        console.error('Error loading admin dashboard:', error)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchStatsAndActivities()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchCalendar = async () => {
      try {
        setCalendarLoading(true)
        const monthParam = format(calendarMonth, 'yyyy-MM')
        const response = await fetch(`/api/dashboard/calendar?month=${monthParam}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to fetch calendar data')
        }

        const data = await response.json()
        setCalendarEntries(data.items || [])
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching calendar data:', error)
        }
      } finally {
        setCalendarLoading(false)
      }
    }

    fetchCalendar()

    return () => controller.abort()
  }, [calendarMonth])

  const activeUsers = Math.max(
    0,
    Math.round(
      ((stats?.students?.new || 0) + (stats?.events?.thisMonth || 0)) * 0.35
    )
  )

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [calendarMonth])

  const upcomingEventCount = useMemo(() => {
    const todayStart = startOfDay(new Date())
    return calendarEntries.filter((entry) => {
      if (entry.type !== 'event') return false
      const entryDate = parseDateValue(entry.date)
      return isSameMonth(entryDate, calendarMonth) && entryDate >= todayStart
    }).length
  }, [calendarEntries, calendarMonth])

  const upcomingItems = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const horizon = addDays(todayStart, 14)
    return calendarEntries
      .filter((entry) => {
        const entryDate = parseDateValue(entry.date)
        return entryDate >= todayStart && entryDate <= horizon
      })
      .sort((a, b) => parseDateValue(a.date).getTime() - parseDateValue(b.date).getTime())
      .slice(0, 5)
  }, [calendarEntries])

  const getEntriesForDay = (day: Date) => {
    return calendarEntries
      .filter((entry) => isSameDay(parseDateValue(entry.date), day))
      .sort((a, b) => parseDateValue(a.date).getTime() - parseDateValue(b.date).getTime())
  }

  const handleDateClick = (day: Date) => {
    setSelectedDate(day)
  }

  const selectedDateEntries = selectedDate ? getEntriesForDay(selectedDate) : []

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
    <div className="ml-5 md:ml-5 space-y-8 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Welcome Header with illustration */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1E293B] dark:text-white">
            Hello, Admin! Here’s your overview for today.
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            SmartU — Smart Solutions for BukSU
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700 px-4 py-3">
          <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-300" />
          <span className="text-sm font-medium text-[#1E293B] dark:text-white">Stay smart. Stay organized.</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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
          title="Total Events"
          value={stats?.events.total || 0}
          icon={Calendar}
          growth={stats?.events.growthPercent || 0}
          growthLabel="this month"
          isLoading={loading}
          href="/dashboard/events"
        />
        <StatCard
          title="Collected Fees"
          value={stats?.revenue.total || 0}
          icon={CreditCard}
          growth={stats?.revenue.growthPercent || 0}
          growthLabel="vs last month"
          prefix="₱"
          isLoading={loading}
          href="/dashboard/fees"
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          icon={User}
          growth={5}
          growthLabel="today"
          isLoading={loading}
        />
      </div>

      {/* Main grid: Activity timeline + Performance + Calendar */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Timeline */}
        <Card className="xl:col-span-2 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              Activity Timeline
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={downloadingTimeline || loading || activities.length === 0}
              onClick={async () => {
                if (downloadingTimeline || activities.length === 0) return
                try {
                  setDownloadingTimeline(true)
                  const res = await fetch("/api/dashboard/activity-timeline/pdf")
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    Swal.fire({
                      icon: "error",
                      title: "Download failed",
                      text: data.error || "Failed to generate activity timeline PDF.",
                      toast: true,
                      position: "top-end",
                      showConfirmButton: false,
                      timer: 4000,
                      timerProgressBar: true,
                    })
                    return
                  }
                  const blob = await res.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "activity-timeline.pdf"
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  window.URL.revokeObjectURL(url)

                  Swal.fire({
                    icon: "success",
                    title: "PDF download started",
                    text: "Your activity timeline PDF is being downloaded.",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                  })
                } catch (error) {
                  console.error("Activity timeline PDF download failed", error)
                  Swal.fire({
                    icon: "error",
                    title: "Download failed",
                    text: "Unable to download activity timeline PDF.",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true,
                  })
                } finally {
                  setDownloadingTimeline(false)
                }
              }}
            >
              {downloadingTimeline ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                "Download PDF"
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-slate-400 py-6">
                  No recent activity
                </p>
              ) : (
                activities.slice(0, 8).map((activity) => (
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

        {/* Calendar / Upcoming */}
        <Card className="xl:col-span-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-slate-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                <span>Calendar</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  disabled={calendarLoading}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 min-w-[120px] text-center">
                  {format(calendarMonth, 'MMMM yyyy')}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={calendarLoading}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Badge className="bg-blue-600 text-white dark:bg-blue-500 dark:text-white min-w-[92px] justify-center">
                  {calendarLoading ? 'Loading...' : `${upcomingEventCount} upcoming`}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calendarLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-blue-100 dark:border-slate-800 overflow-hidden">
                  <div className="grid grid-cols-7 text-xs text-slate-500 dark:text-slate-300 bg-blue-50/60 dark:bg-slate-800/60">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=>(
                      <div key={d} className="p-2 text-center font-medium">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-blue-100 dark:bg-slate-800">
                    {calendarDays.map((day) => {
                      const dayEntries = getEntriesForDay(day)
                      const isCurrentMonth = isSameMonth(day, calendarMonth)
                      const dayClassNames = [
                        "h-28 bg-white dark:bg-slate-900 p-2 transition-colors",
                        !isCurrentMonth ? "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500" : "",
                        isToday(day) ? "ring-1 ring-blue-400" : "",
                      ].join(" ")

                      return (
                        <div 
                          key={day.toISOString()} 
                          className={`${dayClassNames} ${dayEntries.length > 0 ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800' : ''}`}
                          onClick={() => dayEntries.length > 0 && handleDateClick(day)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-200">
                              {format(day, 'd')}
                            </span>
                            {isToday(day) && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1">
                            {dayEntries.slice(0, 3).map((entry) => {
                              const config = calendarTypeConfig[entry.type]
                              const detail =
                                entry.type === 'event' && entry.start_time
                                  ? `${entry.start_time}${entry.end_time ? `–${entry.end_time}` : ''}`
                                  : entry.type === 'fee' && entry.amount
                                  ? `₱${entry.amount.toLocaleString()}`
                                  : ""
                              return (
                                <div key={`${entry.type}-${entry.id}`} className="flex items-center gap-1">
                                  <span className={`h-2 w-2 rounded-full ${config.dot}`}></span>
                                  <span
                                    className="text-[10px] text-slate-600 dark:text-slate-300 truncate"
                                    title={[entry.title, detail].filter(Boolean).join(" • ")}
                                  >
                                    {entry.title}
                                  </span>
                                </div>
                              )
                            })}
                            {dayEntries.length > 3 && (
                              <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                +{dayEntries.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  {Object.entries(calendarTypeConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`}></span>
                      {config.label}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Upcoming (next 2 weeks)
                  </h4>
                  {upcomingItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No upcoming items in the next two weeks.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingItems.map((item) => {
                        const config = calendarTypeConfig[item.type]
                        const entryDate = parseDateValue(item.date)
                        const detail =
                          item.type === 'event' && item.start_time
                            ? `${item.start_time}${item.end_time ? ` – ${item.end_time}` : ''}`
                            : item.type === 'fee' && item.amount
                            ? `₱${item.amount.toLocaleString()}`
                            : item.type === 'evaluation' && item.status
                            ? item.status
                            : ''

                        return (
                          <div
                            key={`upcoming-${item.type}-${item.id}`}
                            className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
                          >
                            <span className={`mt-2 h-2.5 w-2.5 rounded-full ${config.dot}`}></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-semibold uppercase tracking-wide ${config.text}`}>
                                  {config.label}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {format(entryDate, 'MMM d, yyyy')}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {[detail, item.location].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance section */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress circles */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Engagement", value: Math.min(100, (stats?.events.thisMonth || 0) * 8) },
                { label: "Attendance", value: Math.min(100, stats?.students.growthPercent || 0) },
                { label: "Participation", value: Math.min(100, (stats?.events.total || 0) % 100) }
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg viewBox="0 0 36 36" className="w-24 h-24">
                      <path
                        className="text-slate-200 dark:text-slate-700"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
                      />
                      <path
                        className="text-blue-500 dark:text-blue-300"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={`${item.value}, 100`}
                        d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-[#1E293B] dark:text-white">{item.value}%</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-6 gap-3 items-end h-40">
                {[12, 24, 32, 18, 36, 28].map((h, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="w-8 rounded-xl bg-gradient-to-t from-blue-200 to-blue-500 dark:from-blue-900/40 dark:to-blue-500" style={{ height: `${h * 3}px` }} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">W{idx + 1}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Weekly student engagement trend
              </div>
            </div>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Performed by</p>
                          <p className="text-sm">
                            {activityDetails.user_name || 'System'}
                            {activityDetails.role ? (
                              <span className="text-xs text-gray-500 ml-1">
                                ({activityDetails.role})
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Module & Action</p>
                          <p className="text-sm">
                            {(activityDetails.module || 'system') +
                              (activityDetails.action ? ` • ${activityDetails.action}` : '')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Target</p>
                          <p className="text-sm">
                            {activityDetails.target_type || 'N/A'}
                            {activityDetails.target_name
                              ? ` • ${activityDetails.target_name}`
                              : ''}
                          </p>
                          {activityDetails.target_id && (
                            <p className="text-xs text-gray-500 break-all">
                              ID: {activityDetails.target_id}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Scope</p>
                          <p className="text-sm">
                            College: {activityDetails.college || 'N/A'}
                          </p>
                          <p className="text-sm">
                            Course: {activityDetails.course || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500">Details</p>
                        <pre className="mt-1 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md p-2 max-h-40 overflow-auto">
                          {activityDetails.details
                            ? JSON.stringify(activityDetails.details, null, 2)
                            : 'N/A'}
                        </pre>
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

      {/* Date Details Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              {selectedDateEntries.length > 0 
                ? `${selectedDateEntries.length} item${selectedDateEntries.length > 1 ? 's' : ''} scheduled for this date`
                : 'No items scheduled for this date'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDateEntries.length > 0 ? (
            <div className="space-y-4 mt-4">
              {selectedDateEntries.map((entry) => {
                const config = calendarTypeConfig[entry.type]
                return (
                  <Card 
                    key={`${entry.type}-${entry.id}`} 
                    className={`border-l-4 ${
                      entry.type === 'event' ? 'border-l-blue-500' : 
                      entry.type === 'evaluation' ? 'border-l-amber-500' : 
                      'border-l-green-500'
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${config.dot}`}></span>
                          <CardTitle className="text-lg">{entry.title}</CardTitle>
                        </div>
                        <Badge className={config.pill}>
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {entry.type === 'event' && (
                        <>
                          {entry.start_time && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-slate-500" />
                              <span className="text-slate-700 dark:text-slate-300">
                                {entry.start_time}
                                {entry.end_time && ` - ${entry.end_time}`}
                              </span>
                            </div>
                          )}
                          {entry.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-slate-500" />
                              <span className="text-slate-700 dark:text-slate-300">{entry.location}</span>
                            </div>
                          )}
                          {entry.status && (
                            <div className="flex items-center gap-2">
                              <Badge variant={entry.status === 'APPROVED' ? 'default' : 'secondary'}>
                                {entry.status}
                              </Badge>
                            </div>
                          )}
                          <div className="pt-2">
                            <Link href={`/dashboard/events/${entry.id}`}>
                              <Button variant="outline" size="sm">
                                View Event Details
                              </Button>
                            </Link>
                          </div>
                        </>
                      )}
                      
                      {entry.type === 'fee' && (
                        <>
                          {entry.amount && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-slate-500" />
                              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                ₱{entry.amount.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="pt-2">
                            <Link href="/dashboard/fees">
                              <Button variant="outline" size="sm">
                                View Fee Details
                              </Button>
                            </Link>
                          </div>
                        </>
                      )}
                      
                      {entry.type === 'evaluation' && (
                        <>
                          {entry.start_time && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-slate-500" />
                              <span className="text-slate-700 dark:text-slate-300">
                                Deadline: {entry.start_time}
                              </span>
                            </div>
                          )}
                          <div className="pt-2">
                            <Link href="/dashboard/forms">
                              <Button variant="outline" size="sm">
                                View Evaluation
                              </Button>
                            </Link>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No items scheduled for this date</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 