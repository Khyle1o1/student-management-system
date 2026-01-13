"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  TrendingUp,
  BookOpen,
  Users,
  MapPin,
  RefreshCw,
  Edit,
  Save,
  X
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Student {
  id: string
  student_id: string
  name: string
  email: string
  phone?: string
  college: string
  course: string
  year_level: string
}

interface AttendanceRecord {
  id: string
  status: string
  created_at: string
  event: {
    id: string
    title: string
    description: string
    date: string
  }
}

interface Payment {
  id: string
  amount: number
  status: string
  payment_date: string
  payment_method: string
  reference: string
  fee: {
    id: string
    name: string
    type: string
  }
}

interface EventWithStatus {
  id: string
  title: string
  description: string
  date: string
  attendanceStatus: 'ATTENDED' | 'MISSED' | 'LATE'
  statusDetails: {
    timeIn?: string
    timeOut?: string
    recordedAt?: string
  } | null
}

interface StudentDashboardData {
  student: Student
  attendance: {
    records: AttendanceRecord[]
    stats: {
      total: number
      present: number
      absent: number
      late: number
      rate: number
    }
  }
  payments: {
    records: Payment[]
    stats: {
      total: number
      paid: number
      pending: number
    }
  }
  upcomingEvents: any[]
  eventsWithStatus?: EventWithStatus[]
  eventsStats?: {
    total: number
    attended: number
    missed: number
    attendanceRate: number
  }
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    student_id: "",
    name: "",
    email: ""
  })
  const [saving, setSaving] = useState(false)

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch both dashboard data and events with status in parallel
      const [dashboardRes, eventsRes] = await Promise.all([
        fetch(`/api/students/dashboard/${id}`),
        fetch(`/api/students/${id}/events-with-status?filter=all`)
      ])
      
      if (!dashboardRes.ok) {
        const error = await dashboardRes.json()
        throw new Error(error.error || 'Failed to fetch student data')
      }
      
      const studentData = await dashboardRes.json()
      
      // Add events with status to the data if available
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        console.log('✅ Events with status loaded:', eventsData)
        console.log('✅ Stats from API:', eventsData.stats)
        studentData.eventsWithStatus = eventsData.events
        studentData.eventsStats = eventsData.stats
        console.log('✅ studentData after update:', {
          hasEventsStats: !!studentData.eventsStats,
          eventsStats: studentData.eventsStats,
          eventsCount: studentData.eventsWithStatus?.length
        })
      } else {
        console.error('❌ Failed to fetch events with status:', eventsRes.status)
        const errorData = await eventsRes.json()
        console.error('Error details:', errorData)
      }
      
      console.log('📊 Final data being set:', {
        hasEventsStats: !!studentData.eventsStats,
        stats: studentData.eventsStats
      })
      setData(studentData)
    } catch (error) {
      console.error("Error fetching student data:", error)
      toast({
        title: "Error",
        description: "Failed to load student information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    if (id) {
      fetchStudentData()
    }
  }, [id, fetchStudentData])

  useEffect(() => {
    if (data?.student) {
      setEditForm({
        student_id: data.student.student_id || "",
        name: data.student.name || "",
        email: data.student.email || ""
      })
    }
  }, [data])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (data?.student) {
      setEditForm({
        student_id: data.student.student_id || "",
        name: data.student.name || "",
        email: data.student.email || ""
      })
    }
  }

  const handleSave = async () => {
    if (!data?.student) return

    // Validate required fields
    if (!editForm.name || !editForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    if (!editForm.email || !editForm.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    if (!editForm.student_id || !editForm.student_id.trim()) {
      toast({
        title: "Validation Error",
        description: "Student ID is required",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editForm.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const requestBody: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        student_id: editForm.student_id.trim(),
        college: data.student.college,
        year_level: typeof data.student.year_level === 'number' 
          ? data.student.year_level 
          : parseInt(String(data.student.year_level)) || 1,
        course: data.student.course
      }

      // Only include phone if it exists (don't send null)
      if (data.student.phone) {
        requestBody.phone = data.student.phone
      }

      console.log('Sending update request:', requestBody)

      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          const text = await response.text()
          console.log('Error response text:', text)
          errorData = text ? JSON.parse(text) : {}
        } catch (e) {
          // If response is not JSON, use status text
          console.error('Failed to parse error response:', e)
          throw new Error(`Failed to update student: ${response.statusText}`)
        }
        
        console.log('Error data:', errorData)
        
        // Handle Zod validation errors - can be in error.errors or error.details or error.error
        let validationErrors = null
        if (Array.isArray(errorData.error)) {
          validationErrors = errorData.error
        } else if (Array.isArray(errorData.errors)) {
          validationErrors = errorData.errors
        } else if (Array.isArray(errorData.details)) {
          validationErrors = errorData.details
        }
        
        if (validationErrors && validationErrors.length > 0) {
          const errorMessages = validationErrors.map((err: any) => {
            const field = err.path?.join('.') || err.path?.[0] || 'field'
            return `${field}: ${err.message}`
          }).join(', ')
          throw new Error(errorMessages)
        }
        
        // Handle single error message
        let errorMessage = errorData.error || errorData.message || 'Failed to update student'
        if (typeof errorMessage !== 'string') {
          errorMessage = JSON.stringify(errorMessage)
        }
        throw new Error(errorMessage)
      }

      toast({
        title: "Success",
        description: "Student information updated successfully",
        variant: "default",
      })

      setIsEditing(false)
      // Refresh student data
      await fetchStudentData()
    } catch (error: any) {
      console.error("Error updating student:", error)
      const errorMessage = error?.message || error?.toString() || "Failed to update student information"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="text-gray-600">Loading student information...</span>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!data) {
    return (
      <DashboardShell>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Student not found</h2>
          <Link href="/dashboard/students">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Button>
          </Link>
        </div>
      </DashboardShell>
    )
  }

  const { student, attendance, payments, eventsWithStatus, eventsStats } = data

  // Debug logging
  console.log('🔍 Component render - eventsStats:', eventsStats)
  console.log('🔍 Component render - eventsWithStatus:', eventsWithStatus?.length)

  // Use the new events with status if available, otherwise fall back to old behavior
  const attendedEvents = eventsWithStatus 
    ? eventsWithStatus.filter(event => 
        event.attendanceStatus === 'ATTENDED' || event.attendanceStatus === 'LATE'
      )
    : attendance.records.filter(record => 
        record.status === 'PRESENT' || record.status === 'LATE'
      )
  
  const missedEvents = eventsWithStatus
    ? eventsWithStatus.filter(event => event.attendanceStatus === 'MISSED')
    : attendance.records.filter(record => record.status === 'ABSENT')

  // Separate paid and unpaid fees
  const paidPayments = payments.records.filter(payment => 
    payment.status === 'PAID'
  )
  const unpaidPayments = payments.records.filter(payment => 
    payment.status !== 'PAID'
  )

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/students">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Students
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{student.name}</h1>
              <p className="text-muted-foreground">
                Student ID: {student.student_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button 
                  onClick={handleEdit} 
                  variant="default" 
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  onClick={fetchStudentData} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleSave} 
                  variant="default" 
                  size="sm"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button 
                  onClick={handleCancel} 
                  variant="outline" 
                  size="sm"
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Attendance Rate</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {eventsStats ? eventsStats.attendanceRate : attendance.stats.rate}%
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Events Attended</p>
                  <p className="text-3xl font-bold text-green-700">
                    {eventsStats ? eventsStats.attended : attendedEvents.length}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Events Missed</p>
                  <p className="text-3xl font-bold text-red-700">
                    {eventsStats ? eventsStats.missed : missedEvents.length}
                  </p>
                </div>
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Outstanding Balance</p>
                  <p className="text-3xl font-bold text-purple-700">₱{payments.stats.pending.toLocaleString()}</p>
                </div>
                <CreditCard className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="all-events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              All Events ({eventsWithStatus?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="attended" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Attended ({attendedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="missed" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Missed ({missedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paid ({paidPayments.length})
            </TabsTrigger>
            <TabsTrigger value="unpaid" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Unpaid ({unpaidPayments.length})
            </TabsTrigger>
          </TabsList>

          {/* All Events Tab */}
          <TabsContent value="all-events">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  All Applicable Events ({eventsWithStatus?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!eventsWithStatus || eventsWithStatus.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No applicable events found for this student</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventsWithStatus.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>{format(new Date(event.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            {event.statusDetails?.timeIn 
                              ? format(new Date(event.statusDetails.timeIn), "HH:mm")
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              event.attendanceStatus === 'ATTENDED'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : event.attendanceStatus === 'LATE'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }>
                              {event.attendanceStatus === 'ATTENDED' && '🟢 ATTENDED'}
                              {event.attendanceStatus === 'LATE' && '🟡 LATE'}
                              {event.attendanceStatus === 'MISSED' && '🔴 MISSED'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {event.description || 'No description'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="student_id">Student ID</Label>
                        <Input
                          id="student_id"
                          value={editForm.student_id}
                          onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value.replace(/\D/g, '') })}
                          placeholder="Enter student ID"
                          pattern="\d*"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="Enter email"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Full Name</p>
                        <p className="text-lg font-semibold">{student.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Student ID</p>
                        <p className="text-lg font-semibold">{student.student_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-lg font-semibold">{student.email}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">College</p>
                    <p className="text-lg font-semibold">{student.college}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Course</p>
                    <p className="text-lg font-semibold">{student.course}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Year Level</p>
                    <p className="text-lg font-semibold">{student.year_level}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Attendance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Total Events</span>
                    <span className="font-semibold">
                      {eventsStats ? eventsStats.total : attendance.stats.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-green-600">Attended</span>
                    <span className="font-semibold text-green-700">
                      {eventsStats ? eventsStats.attended : attendance.stats.present}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-red-600">Missed</span>
                    <span className="font-semibold text-red-700">
                      {eventsStats ? eventsStats.missed : attendance.stats.absent}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-blue-600">Attendance Rate</span>
                      <span className="font-bold text-blue-700">
                        {eventsStats ? eventsStats.attendanceRate : attendance.stats.rate}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-600">Total Fees</p>
                    <p className="text-2xl font-bold text-blue-700">₱{payments.stats.total.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-600">Paid</p>
                    <p className="text-2xl font-bold text-green-700">₱{payments.stats.paid.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-600">Outstanding</p>
                    <p className="text-2xl font-bold text-red-700">₱{payments.stats.pending.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attended Events Tab */}
          <TabsContent value="attended">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Events Attended ({attendedEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendedEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No events attended yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendedEvents.map((event: any) => {
                        // Handle both old AttendanceRecord format and new EventWithStatus format
                        const isNewFormat = 'attendanceStatus' in event
                        const title = isNewFormat ? event.title : event.event.title
                        const date = isNewFormat ? event.date : event.event.date
                        const description = isNewFormat ? event.description : event.event.description
                        const status = isNewFormat ? event.attendanceStatus : event.status
                        const timeIn = isNewFormat ? event.statusDetails?.timeIn : event.time_in
                        
                        return (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{title}</TableCell>
                            <TableCell>{format(new Date(date), "MMM dd, yyyy")}</TableCell>
                            <TableCell>
                              {timeIn ? format(new Date(timeIn), "HH:mm") : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                status === 'PRESENT' || status === 'ATTENDED'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }>
                                {status === 'ATTENDED' ? '🟢 ATTENDED' : status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {description || 'No description'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Missed Events Tab */}
          <TabsContent value="missed">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Events Missed ({missedEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missedEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                    <p>Great! No events missed</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missedEvents.map((event: any) => {
                        // Handle both old AttendanceRecord format and new EventWithStatus format
                        const isNewFormat = 'attendanceStatus' in event
                        const title = isNewFormat ? event.title : event.event.title
                        const date = isNewFormat ? event.date : event.event.date
                        const description = isNewFormat ? event.description : event.event.description
                        
                        return (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{title}</TableCell>
                            <TableCell>{format(new Date(date), "MMM dd, yyyy")}</TableCell>
                            <TableCell>
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                🔴 MISSED
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-red-600 italic">
                              Student did not attend this event
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {description || 'No description'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paid Fees Tab */}
          <TabsContent value="paid">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  Paid Fees ({paidPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paidPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.fee.name}</TableCell>
                          <TableCell>₱{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                          <TableCell>{payment.reference || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              PAID
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unpaid Fees Tab */}
          <TabsContent value="unpaid">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Outstanding Fees ({unpaidPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unpaidPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                    <p>All fees are up to date!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fee Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.fee.name}</TableCell>
                          <TableCell>₱{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={
                              payment.status === 'PENDING' 
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : payment.status === 'OVERDUE'
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            }>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.fee.type}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
} 