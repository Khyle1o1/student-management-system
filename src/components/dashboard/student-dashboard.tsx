"use client"

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
  Award
} from "lucide-react"
import Link from "next/link"

interface StudentDashboardProps {
  studentId: string | null
}

// Mock data - in real app, this would come from API
const studentData = {
  attendanceRate: 85,
  totalEvents: 20,
  attendedEvents: 17,
  totalFees: 1200,
  paidFees: 800,
  pendingFees: 400,
  grade: "A-",
  gpa: 3.7,
  creditsCompleted: 45,
  totalCredits: 60
}

const recentAttendance = [
  { id: 1, event: "Advanced Mathematics", date: "2025-01-10", status: "PRESENT", type: "class" },
  { id: 2, event: "Science Fair Presentation", date: "2025-01-08", status: "PRESENT", type: "event" },
  { id: 3, event: "Physical Education", date: "2025-01-05", status: "ABSENT", type: "class" },
  { id: 4, event: "Art Exhibition Opening", date: "2025-01-03", status: "PRESENT", type: "event" },
  { id: 5, event: "English Literature", date: "2025-01-02", status: "PRESENT", type: "class" },
]

const feeStatus = [
  { id: 1, name: "Registration Fee", amount: 500, status: "PAID", dueDate: "2025-01-01", category: "registration" },
  { id: 2, name: "Laboratory Fee", amount: 300, status: "PAID", dueDate: "2025-01-15", category: "academic" },
  { id: 3, name: "Activity Fee", amount: 200, status: "UNPAID", dueDate: "2025-02-01", category: "activity" },
  { id: 4, name: "Library Fee", amount: 200, status: "UNPAID", dueDate: "2025-02-15", category: "academic" },
]

const upcomingEvents = [
  { id: 1, title: "Midterm Examinations", date: "Feb 5-10", type: "exam", priority: "high" },
  { id: 2, title: "Career Fair", date: "Feb 15", type: "event", priority: "medium" },
  { id: 3, title: "Project Presentations", date: "Feb 20", type: "assignment", priority: "high" },
]

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  progress, 
  description,
  color = "blue"
}: {
  title: string
  value: string | number
  icon: any
  progress?: number
  description: string
  color?: string
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600"
  }

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        <div className={`p-2 bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} rounded-lg`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-2">
          {value}
        </div>
        {progress !== undefined && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-600">
          {description}
        </p>
      </CardContent>
      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} opacity-10 rounded-full -translate-y-4 translate-x-4`}></div>
    </Card>
  )
}

function AttendanceItem({ record }: { record: typeof recentAttendance[0] }) {
  const getTypeIcon = () => {
    return record.type === "class" ? 
      <BookOpen className="h-4 w-4 text-blue-500" /> : 
      <Calendar className="h-4 w-4 text-purple-500" />
  }

  const getStatusColor = () => {
    return record.status === "PRESENT" ? 
      "border-l-green-400 bg-green-50" : 
      "border-l-red-400 bg-red-50"
  }

  return (
    <div className={`p-3 border-l-4 rounded-r-lg ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getTypeIcon()}
          <div>
            <p className="font-medium text-gray-900 text-sm">{record.event}</p>
            <p className="text-gray-600 text-xs capitalize">{record.type} • {record.date}</p>
          </div>
        </div>
        <Badge 
          variant={record.status === "PRESENT" ? "default" : "destructive"}
          className="flex items-center gap-1 text-xs"
        >
          {record.status === "PRESENT" ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {record.status}
        </Badge>
      </div>
    </div>
  )
}

function FeeItem({ fee }: { fee: typeof feeStatus[0] }) {
  const isOverdue = fee.status === "UNPAID" && new Date(fee.dueDate) < new Date()
  
  const getCategoryColor = () => {
    switch (fee.category) {
      case "registration": return "bg-blue-100 text-blue-800"
      case "academic": return "bg-green-100 text-green-800"
      case "activity": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <CreditCard className="h-4 w-4 text-gray-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{fee.name}</p>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className={`text-xs ${getCategoryColor()}`}>
              {fee.category}
            </Badge>
            <span className="text-xs text-gray-500">Due: {fee.dueDate}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-gray-900">₱{fee.amount}</p>
        <div className="flex items-center space-x-2 mt-1">
          {isOverdue && <AlertTriangle className="h-3 w-3 text-red-500" />}
          <Badge 
            variant={fee.status === "PAID" ? "default" : "destructive"}
            className="text-xs"
          >
            {fee.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export function StudentDashboard({ studentId }: StudentDashboardProps) {
  const paymentProgress = Math.round((studentData.paidFees / studentData.totalFees) * 100)
  const creditProgress = Math.round((studentData.creditsCompleted / studentData.totalCredits) * 100)

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
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Attendance Rate"
          value={`${studentData.attendanceRate}%`}
          icon={Calendar}
          progress={studentData.attendanceRate}
          description={`${studentData.attendedEvents} of ${studentData.totalEvents} events attended`}
          color="blue"
        />
        <StatCard
          title="Payment Progress"
          value={`${paymentProgress}%`}
          icon={DollarSign}
          progress={paymentProgress}
          description={`₱${studentData.paidFees} paid of ₱${studentData.totalFees}`}
          color="green"
        />
        <StatCard
          title="Current GPA"
          value={studentData.gpa}
          icon={Award}
          description={`Grade: ${studentData.grade} • Excellent performance`}
          color="purple"
        />
        <StatCard
          title="Credits Progress"
          value={`${studentData.creditsCompleted}/${studentData.totalCredits}`}
          icon={Target}
          progress={creditProgress}
          description={`${100 - creditProgress}% remaining to graduation`}
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Attendance */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Recent Attendance</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Last 5 records
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAttendance.map((record) => (
              <AttendanceItem key={record.id} record={record} />
            ))}
            <Link href="/dashboard/attendance">
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
            {upcomingEvents.map((event) => (
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
                  <span>{event.date}</span>
                  <span>•</span>
                  <span className="capitalize">{event.type}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Fee Status */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span>Fee Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                ₱{studentData.pendingFees} pending
              </span>
              <Link href="/dashboard/fees">
                <Button variant="outline" size="sm">
                  Pay Now
                </Button>
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feeStatus.map((fee) => (
            <FeeItem key={fee.id} fee={fee} />
          ))}
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
            <Link href="/dashboard/attendance">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex flex-col items-start space-y-1">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">View Attendance</span>
                  <span className="text-xs text-gray-500">Check your records</span>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/fees">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex flex-col items-start space-y-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">Pay Fees</span>
                  <span className="text-xs text-gray-500">Make payments online</span>
                </div>
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="flex flex-col items-start space-y-1">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">Course Materials</span>
                <span className="text-xs text-gray-500">Access study resources</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 