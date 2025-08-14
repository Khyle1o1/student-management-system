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
  ArrowLeft,
  Award,
  FileText,
  Download
} from "lucide-react"
import { format } from "date-fns"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import Link from "next/link"

interface Event {
  id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  location: string
  scope_type: string
  scope_college: string | null
  scope_course: string | null
  require_evaluation: boolean
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

interface CertificateStats {
  totalGenerated: number
  totalAccessible: number
  pendingEvaluation: number
  hasTemplate: boolean
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
  const [certificateGenerating, setCertificateGenerating] = useState(false)
  const [stats, setStats] = useState<AttendanceStats>({
    totalPresent: 0,
    signedInOnly: 0,
    totalSignedIn: 0,
    totalRecords: 0
  })
  const [certificateStats, setCertificateStats] = useState<CertificateStats>({
    totalGenerated: 0,
    totalAccessible: 0,
    pendingEvaluation: 0,
    hasTemplate: false
  })
  const [eventTimeStatus, setEventTimeStatus] = useState<EventTimeStatus | null>(null)

  // Helper function to safely parse date with Philippine timezone
  const parseEventDate = (dateString: string): Date => {
    try {
      // Handle different date formats
      let parsedDate: Date
      
      if (dateString.includes('T')) {
        // Already has time component
        parsedDate = new Date(dateString)
      } else {
        // Just date, add Philippine timezone
        parsedDate = new Date(dateString + 'T00:00:00+08:00')
      }
      
      // Check if date is valid
      if (isNaN(parsedDate.getTime())) {
        // Fallback: try parsing as just date
        parsedDate = new Date(dateString)
      }
      
      return parsedDate
    } catch (error) {
      console.error('Error parsing date:', error, 'Date string:', dateString)
      return new Date() // Return current date as fallback
    }
  }

  // Check event time status
  const checkEventTimeStatus = (event: Event): EventTimeStatus => {
    const now = new Date()
    const eventDate = parseEventDate(event.date)
    
    // Check if date parsing failed
    if (isNaN(eventDate.getTime())) {
      return {
        isActive: false,
        status: 'ended',
        message: 'Invalid date format'
      }
    }
    
    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)
    
    // Create start and end datetime objects in Philippine Time
    const eventStartTime = new Date(eventDate)
    eventStartTime.setHours(startHour, startMinute, 0, 0)
    
    const eventEndTime = new Date(eventDate)
    eventEndTime.setHours(endHour, endMinute, 59, 999)
    
    // Check if it's the right date (using Philippine Time)
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)) // Add 8 hours for Philippine Time
    const currentDate = new Date(phTime.getUTCFullYear(), phTime.getUTCMonth(), phTime.getUTCDate())
    const eventOnlyDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    
    if (currentDate.getTime() !== eventOnlyDate.getTime()) {
      if (currentDate < eventOnlyDate) {
        return {
          isActive: false,
          status: 'not-started',
          message: `Event is scheduled for ${eventDate.toLocaleDateString()}`
        }
      } else {
        return {
          isActive: false,
          status: 'ended',
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
        message: `Event starts at ${event.start_time} (${timeUntilStart} minutes from now)`
      }
    }
    
    if (now > eventEndTime) {
      return {
        isActive: false,
        status: 'ended',
        message: `Event ended at ${event.end_time}`
      }
    }
    
    return {
      isActive: true,
      status: 'active',
      message: `Event is active until ${event.end_time}`
    }
  }

  // Fetch event details
  const fetchEvent = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data)
      }
    } catch (error) {
      console.error("Error fetching event:", error)
    }
  }, [id])

  // Fetch attendance records
  const fetchAttendanceRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/attendance/event/${id}/records`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAttendanceRecords(data.records)
        }
      }
    } catch (error) {
      console.error("Error fetching attendance records:", error)
    }
  }, [id])

  // Fetch attendance stats
  const fetchAttendanceStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/attendance/event/${id}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching attendance stats:", error)
    }
  }, [id])

  // Fetch certificate stats
  const fetchCertificateStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/certificates?event_id=${id}`)
      if (response.ok) {
        const data = await response.json()
        const certificates = data.certificates || []
        
        // Calculate certificate statistics
        const totalGenerated = certificates.length
        const totalAccessible = certificates.filter((c: any) => c.is_accessible).length
        const pendingEvaluation = certificates.filter((c: any) => !c.is_accessible).length
        
        setCertificateStats({
          totalGenerated,
          totalAccessible,
          pendingEvaluation,
          hasTemplate: totalGenerated > 0 // If certificates exist, template exists
        })
      }
    } catch (error) {
      console.error("Error fetching certificate stats:", error)
    }
  }, [id])

  // Generate certificates for event
  const handleGenerateCertificates = async () => {
    if (!event) return
    
    setCertificateGenerating(true)
    
    try {
      const response = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const results = data.results || []
        const successCount = results.filter((r: any) => r.success).length
        const failureCount = results.filter((r: any) => !r.success).length
        
        if (successCount > 0) {
          toast({
            title: "✅ Certificates Generated Successfully",
            description: `Generated ${successCount} certificates${failureCount > 0 ? ` (${failureCount} failed)` : ''}`,
          })
        } else {
          toast({
            title: "ℹ️ No New Certificates",
            description: data.message || "No new certificates were generated",
          })
        }
        
        // Refresh certificate stats
        fetchCertificateStats()
      } else {
        toast({
          title: "❌ Generation Failed",
          description: data.error || "Failed to generate certificates",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error generating certificates:", error)
      toast({
        title: "❌ Generation Failed",
        description: "Failed to generate certificates",
        variant: "destructive",
      })
    } finally {
      setCertificateGenerating(false)
    }
  }

  // Auto-generate certificates when students sign out
  const autoGenerateCertificates = useCallback(async () => {
    if (!event || !event.id) return
    
    try {
      // Only auto-generate if event has ended or if there are students who completed attendance
      if (stats.totalPresent > 0) {
        await fetch('/api/certificates/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_id: event.id
          })
        })
        
        // Refresh certificate stats after auto-generation
        fetchCertificateStats()
      }
    } catch (error) {
      console.error("Error auto-generating certificates:", error)
    }
  }, [event, stats.totalPresent, fetchCertificateStats])

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchEvent(),
        fetchAttendanceRecords(),
        fetchAttendanceStats(),
        fetchCertificateStats()
      ])
      setLoading(false)
    }
    
    if (id) {
      loadData()
    }
  }, [id, fetchEvent, fetchAttendanceRecords, fetchAttendanceStats, fetchCertificateStats])

  // Fetch stats when event is loaded
  useEffect(() => {
    if (event) {
      fetchAttendanceStats()
      fetchCertificateStats()
      // Check initial event time status
      const timeStatus = checkEventTimeStatus(event)
      setEventTimeStatus(timeStatus)
    } else {
      setEventTimeStatus(null)
    }
  }, [event, fetchAttendanceStats, fetchCertificateStats])

  // Auto-generate certificates when students complete attendance
  useEffect(() => {
    if (event && stats.totalPresent > 0) {
      // Auto-generate certificates with a small delay to avoid rapid calls
      const timeoutId = setTimeout(autoGenerateCertificates, 2000)
      return () => clearTimeout(timeoutId)
    }
  }, [event, stats.totalPresent, autoGenerateCertificates])

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
        fetchCertificateStats()
        
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

  const filteredRecords = attendanceRecords.filter(record => {
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
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Loading event attendance...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!event) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Event Not Found</h3>
            <p className="text-muted-foreground">The event you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const scopeDisplay = getEventScopeDisplay(event)

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/events">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
              <p className="text-muted-foreground">Manage attendance for this event</p>
            </div>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
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
                <span>{format(new Date(event.date), "EEEE, MMMM dd, yyyy")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span>{event.start_time} - {event.end_time}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Clock className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Certificates</p>
                  <p className="text-sm text-purple-500 mb-1">Generated/Accessible</p>
                  <p className="text-3xl font-bold text-purple-700">{certificateStats.totalGenerated}/{certificateStats.totalAccessible}</p>
                </div>
                <Award className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificate Management */}
        <Card className="border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-800">Certificate Management</CardTitle>
                  <p className="text-sm text-gray-600">Generate and manage certificates for this event</p>
                </div>
              </div>
              <Button 
                onClick={handleGenerateCertificates}
                disabled={certificateGenerating || stats.totalPresent === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {certificateGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Generate Certificates
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Generated</p>
                  <p className="text-2xl font-bold text-green-700">{certificateStats.totalGenerated}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Accessible</p>
                  <p className="text-2xl font-bold text-blue-700">{certificateStats.totalAccessible}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Evaluation</p>
                  <p className="text-2xl font-bold text-yellow-700">{certificateStats.pendingEvaluation}</p>
                </div>
              </div>
            </div>
            
            {event.require_evaluation && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> This event requires evaluation. Certificates will only be accessible after students complete their evaluations.
                </p>
              </div>
            )}
            
            {stats.totalPresent === 0 && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  Certificates can only be generated after students have fully attended the event (signed in and out).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Recording */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scan className="h-5 w-5" />
              <span>Attendance Recording</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sign-in"
                  name="mode"
                  value="SIGN_IN"
                  checked={mode === 'SIGN_IN'}
                  onChange={(e) => setMode(e.target.value as 'SIGN_IN' | 'SIGN_OUT')}
                  className="h-4 w-4"
                />
                <Label htmlFor="sign-in" className="text-sm font-medium">
                  Sign In
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sign-out"
                  name="mode"
                  value="SIGN_OUT"
                  checked={mode === 'SIGN_OUT'}
                  onChange={(e) => setMode(e.target.value as 'SIGN_IN' | 'SIGN_OUT')}
                  className="h-4 w-4"
                />
                <Label htmlFor="sign-out" className="text-sm font-medium">
                  Sign Out
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleBarcodeSubmit} className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Scan barcode or enter Student ID"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="text-lg"
                    disabled={!eventTimeStatus?.isActive}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={scanLoading || !barcodeInput.trim() || !eventTimeStatus?.isActive}
                  className="px-6"
                >
                  {scanLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{mode === 'SIGN_IN' ? 'Sign In' : 'Sign Out'}</span>
                  )}
                </Button>
              </form>

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
                      <li>• Certificates are auto-generated when students sign out</li>
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