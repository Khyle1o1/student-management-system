"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Target,
  Scan,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  ArrowLeft
} from "lucide-react"
import { format } from "date-fns"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import Link from "next/link"

interface Event {
  id: string
  title: string
  description: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  scope_type: string
  scope_college: string | null
  scope_course: string | null
}

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  timeIn: string
  timeOut: string | null
  status: "PRESENT" | "SIGNED_IN_ONLY" | "INCOMPLETE"
}

interface AttendanceStats {
  totalPresent: number        // Students who completed full attendance (signed in + out)
  signedInOnly: number       // Students who signed in but haven't signed out yet  
  totalSignedIn: number      // Total students who have signed in
  totalRecords: number
}

interface EventTimeStatus {
  isActive: boolean
  status: 'active' | 'not-started' | 'ended' | 'wrong-date'
  message: string
  timeRemaining?: number
}

export default function EventAttendancePage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_OUT'>('SIGN_IN')
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [scanLoading, setScanLoading] = useState(false)
  const [stats, setStats] = useState<AttendanceStats>({
    totalPresent: 0,
    signedInOnly: 0,
    totalSignedIn: 0,
    totalRecords: 0
  })
  const [eventTimeStatus, setEventTimeStatus] = useState<EventTimeStatus | null>(null)

  // Check event time status
  const checkEventTimeStatus = (event: Event): EventTimeStatus => {
    const now = new Date()
    const eventDate = new Date(event.eventDate)
    const [startHour, startMinute] = event.startTime.split(':').map(Number)
    const [endHour, endMinute] = event.endTime.split(':').map(Number)
    
    // Create start and end datetime objects
    const eventStartTime = new Date(eventDate)
    eventStartTime.setHours(startHour, startMinute, 0, 0)
    
    const eventEndTime = new Date(eventDate)
    eventEndTime.setHours(endHour, endMinute, 59, 999)
    
    // Get current date for comparison
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const eventOnlyDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    
    // Check if it's the right date
    if (currentDate.getTime() !== eventOnlyDate.getTime()) {
      if (currentDate < eventOnlyDate) {
        return {
          isActive: false,
          status: 'wrong-date',
          message: `Event is scheduled for ${eventDate.toLocaleDateString()}`
        }
      } else {
        return {
          isActive: false,
          status: 'wrong-date',
          message: `Event was on ${eventDate.toLocaleDateString()}`
        }
      }
    }
    
    // Check if current time is within the event window
    if (now < eventStartTime) {
      const timeUntilStart = Math.ceil((eventStartTime.getTime() - now.getTime()) / (1000 * 60))
      return {
        isActive: false,
        status: 'not-started',
        message: `Event starts in ${timeUntilStart} minutes`,
        timeRemaining: timeUntilStart
      }
    }
    
    if (now > eventEndTime) {
      const timeAfterEnd = Math.ceil((now.getTime() - eventEndTime.getTime()) / (1000 * 60))
      return {
        isActive: false,
        status: 'ended',
        message: `Event ended ${timeAfterEnd} minutes ago`
      }
    }
    
    // Event is currently active
    const timeUntilEnd = Math.ceil((eventEndTime.getTime() - now.getTime()) / (1000 * 60))
    return {
      isActive: true,
      status: 'active',
      message: `Event is active • ${timeUntilEnd} minutes remaining`,
      timeRemaining: timeUntilEnd
    }
  }

  const fetchEventDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setEvent(data)
    } catch (error) {
      console.error("Error fetching event details:", error)
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      })
    }
  }, [id, toast])

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/attendance/event/${id}/records`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setAttendanceRecords(data.records)
    } catch (error) {
      console.error("Error fetching attendance records:", error)
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  const fetchAttendanceStats = useCallback(async () => {
    if (!event) return

    try {
      const response = await fetch(`/api/attendance/event/${id}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching attendance stats:", error)
    }
  }, [id, event])

  useEffect(() => {
    fetchEventDetails()
    fetchAttendanceRecords()
  }, [fetchEventDetails, fetchAttendanceRecords])

  // Fetch stats when event is loaded
  useEffect(() => {
    if (event) {
      fetchAttendanceStats()
      // Check initial event time status
      const timeStatus = checkEventTimeStatus(event)
      setEventTimeStatus(timeStatus)
    } else {
      setEventTimeStatus(null)
    }
  }, [event, fetchAttendanceStats])

  // Periodic update for event time status (every minute)
  useEffect(() => {
    if (!event) return

    const interval = setInterval(() => {
      const timeStatus = checkEventTimeStatus(event)
      setEventTimeStatus(timeStatus)
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [event])

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!event) {
      toast({
        title: "No Event Selected",
        description: "Event information is not loaded",
        variant: "destructive",
      })
      return
    }

    // Check event time status before proceeding
    if (eventTimeStatus && !eventTimeStatus.isActive) {
      toast({
        title: "Event Not Active",
        description: eventTimeStatus.message,
        variant: "destructive",
      })
      return
    }

    if (!barcodeInput.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a student ID",
        variant: "destructive",
      })
      return
    }

    try {
      setScanLoading(true)
      
      const response = await fetch("/api/attendance/barcode-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: barcodeInput.trim(),
          eventId: event.id,
          mode: mode
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Success toast
        toast({
          title: "✅ Attendance Recorded Successfully",
          description: `${data.data.studentName} has ${mode === 'SIGN_IN' ? 'signed in' : 'signed out'} at ${format(new Date(), "HH:mm")}`,
        })
        
        // Refresh stats and records
        fetchAttendanceStats()
        fetchAttendanceRecords()
        
        // Clear input
        setBarcodeInput("")
      } else {
        // Error toast
        toast({
          title: "❌ " + data.error,
          description: "Nothing was saved.",
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error("Error submitting attendance:", error)
      toast({
        title: "Error",
        description: "Failed to record attendance",
        variant: "destructive",
      })
    } finally {
      setScanLoading(false)
    }
  }

  const getEventScopeDisplay = (event: Event) => {
    switch (event.scope_type) {
      case 'UNIVERSITY_WIDE':
        return { label: 'University-wide', color: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' }
      case 'COLLEGE_WIDE':
        return { label: `${event.scope_college}`, color: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' }
      case 'COURSE_SPECIFIC':
        return { label: `${event.scope_course}`, color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' }
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const filteredRecords = attendanceRecords.filter((record) => {
    switch (activeTab) {
      case "present":
        return record.status === "PRESENT"
      case "signed-in-only":
        return record.status === "SIGNED_IN_ONLY"
      case "incomplete":
        return record.status === "INCOMPLETE"
      default:
        return true
    }
  })

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="text-gray-600">Loading event details...</span>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!event) {
    return (
      <DashboardShell>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Event not found</h2>
          <Link href="/dashboard/events">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </Link>
        </div>
      </DashboardShell>
    )
  }

  const scopeDisplay = getEventScopeDisplay(event)

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/events">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
              <p className="text-muted-foreground">
                Manage attendance for this event
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              fetchAttendanceStats()
              fetchAttendanceRecords()
            }} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Event Details */}
        <Card className="border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Event Details</CardTitle>
                <p className="text-sm text-gray-600">{event.description || "No description provided"}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>{format(new Date(event.eventDate), "EEEE, MMMM dd, yyyy")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span>{event.location || 'Location TBD'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-purple-500" />
                <Badge className={scopeDisplay.color}>
                  {scopeDisplay.label}
                </Badge>
              </div>
            </div>

            {/* Event Time Status */}
            {eventTimeStatus && (
              <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                eventTimeStatus.isActive 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {eventTimeStatus.isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    eventTimeStatus.isActive ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {eventTimeStatus.isActive ? 'Event Active' : 'Event Inactive'}
                  </p>
                  <p className={`text-sm ${
                    eventTimeStatus.isActive ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {eventTimeStatus.message}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Signed In</p>
                  <p className="text-3xl font-bold text-green-700">{stats.totalSignedIn}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Fully Present</p>
                  <p className="text-sm text-blue-500 mb-1">(Signed In + Out)</p>
                  <p className="text-3xl font-bold text-blue-700">{stats.totalPresent}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Still Signed In</p>
                  <p className="text-sm text-yellow-500 mb-1">(Not signed out yet)</p>
                  <p className="text-3xl font-bold text-yellow-700">{stats.signedInOnly}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barcode Scanner */}
        <Card className="border-2 border-purple-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Scan className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Attendance Scanner</CardTitle>
                <p className="text-sm text-gray-600">Scan or enter student ID for attendance</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Mode Selection */}
              <div>
                <Label htmlFor="mode-tabs" className="text-lg font-semibold text-gray-700 mb-3 block">
                  Attendance Mode
                </Label>
                <Tabs 
                  value={mode} 
                  onValueChange={(value) => setMode(value as 'SIGN_IN' | 'SIGN_OUT')}
                  className={eventTimeStatus && !eventTimeStatus.isActive ? 'pointer-events-none' : ''}
                >
                  <TabsList className="grid w-full grid-cols-2 h-14 bg-gray-100 rounded-xl p-1">
                    <TabsTrigger 
                      value="SIGN_IN" 
                      className="flex items-center gap-3 text-base font-semibold data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                      value="SIGN_OUT" 
                      className="flex items-center gap-3 text-base font-semibold data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                    >
                      <XCircle className="h-5 w-5" />
                      Sign Out
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Barcode Input */}
              <div>
                <Label htmlFor="student-id" className="text-lg font-semibold text-gray-700 mb-2 block">
                  Student ID
                </Label>
                <form onSubmit={handleBarcodeSubmit} className="flex space-x-3">
                  <Input
                    id="student-id"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={barcodeInput}
                    onChange={(e) => {
                      // Allow only numbers
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      setBarcodeInput(value)
                    }}
                    placeholder="Enter student ID (numbers only)"
                    className={`flex-1 h-14 text-lg border-2 transition-all duration-200 ${
                      eventTimeStatus && !eventTimeStatus.isActive 
                        ? 'border-gray-200 bg-gray-50 text-gray-400' 
                        : 'border-gray-300 focus:border-purple-400'
                    }`}
                    disabled={Boolean(eventTimeStatus && !eventTimeStatus.isActive)}
                    autoComplete="off"
                    autoFocus
                  />
                  <Button 
                    type="submit"
                    size="lg"
                    className={`h-14 px-8 text-base font-semibold transition-all duration-200 ${
                      mode === 'SIGN_IN' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                    disabled={Boolean(eventTimeStatus && !eventTimeStatus.isActive) || scanLoading}
                  >
                    {scanLoading ? (
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Scan className="h-5 w-5 mr-2" />
                    )}
                    {mode === 'SIGN_IN' ? 'Sign In' : 'Sign Out'}
                  </Button>
                </form>
              </div>

              {/* Event Status Warning */}
              {eventTimeStatus && !eventTimeStatus.isActive && (
                <div className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Attendance Recording Disabled</p>
                    <p className="text-sm text-yellow-700">{eventTimeStatus.message}</p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-800 mb-1">Quick Instructions</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Scan barcode or manually enter the student ID</li>
                      <li>• Select Sign In/Sign Out mode based on student status</li>
                      <li>• System validates student eligibility automatically</li>
                      <li>• Success/error messages will appear after each scan</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({attendanceRecords.length})</TabsTrigger>
                <TabsTrigger value="present">Present ({attendanceRecords.filter(r => r.status === "PRESENT").length})</TabsTrigger>
                <TabsTrigger value="signed-in-only">Signed In Only ({attendanceRecords.filter(r => r.status === "SIGNED_IN_ONLY").length})</TabsTrigger>
                <TabsTrigger value="incomplete">Incomplete ({attendanceRecords.filter(r => r.status === "INCOMPLETE").length})</TabsTrigger>
              </TabsList>
              <TabsContent value={activeTab}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.studentId}</TableCell>
                          <TableCell>{record.studentName}</TableCell>
                          <TableCell>{format(new Date(record.timeIn), "HH:mm")}</TableCell>
                          <TableCell>
                            {record.timeOut
                              ? format(new Date(record.timeOut), "HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                record.status === "PRESENT"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : record.status === "SIGNED_IN_ONLY"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
                              }
                              variant="outline"
                            >
                              {record.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
} 