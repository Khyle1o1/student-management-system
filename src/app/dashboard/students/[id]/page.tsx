"use client"

import { useEffect, useState } from "react"
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
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  TrendingUp,
  BookOpen,
  Users,
  MapPin,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: string
  student_id: string
  name: string
  email: string
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
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/students/dashboard/${id}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch student data')
      }
      
      const studentData = await response.json()
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
  }

  useEffect(() => {
    if (id) {
      fetchStudentData()
    }
  }, [id])

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

  const { student, attendance, payments } = data

  // Separate attended and missed events
  const attendedEvents = attendance.records.filter(record => 
    record.status === 'PRESENT' || record.status === 'LATE'
  )
  const missedEvents = attendance.records.filter(record => 
    record.status === 'ABSENT'
  )

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
          <Button 
            onClick={fetchStudentData} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Attendance Rate</p>
                  <p className="text-3xl font-bold text-blue-700">{attendance.stats.rate}%</p>
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
                  <p className="text-3xl font-bold text-green-700">{attendedEvents.length}</p>
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
                  <p className="text-3xl font-bold text-red-700">{missedEvents.length}</p>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Overview
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
                    <span className="font-semibold">{attendance.stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-green-600">Present</span>
                    <span className="font-semibold text-green-700">{attendance.stats.present}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-red-600">Absent</span>
                    <span className="font-semibold text-red-700">{attendance.stats.absent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-yellow-600">Late</span>
                    <span className="font-semibold text-yellow-700">{attendance.stats.late}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-blue-600">Attendance Rate</span>
                      <span className="font-bold text-blue-700">{attendance.stats.rate}%</span>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendedEvents.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.event.title}</TableCell>
                          <TableCell>{format(new Date(record.event.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge className={
                              record.status === 'PRESENT' 
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {record.event.description || 'No description'}
                          </TableCell>
                        </TableRow>
                      ))}
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
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missedEvents.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.event.title}</TableCell>
                          <TableCell>{format(new Date(record.event.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              ABSENT
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {record.event.description || 'No description'}
                          </TableCell>
                        </TableRow>
                      ))}
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