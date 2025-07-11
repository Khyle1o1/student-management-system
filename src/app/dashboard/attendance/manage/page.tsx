"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Activity,
  TrendingUp
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

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

interface AttendanceStats {
  totalSignedIn: number
  totalSignedOut: number
  currentlyPresent: number
}

interface EventTimeStatus {
  isActive: boolean
  status: 'not-started' | 'active' | 'ended' | 'wrong-date'
  message: string
  timeRemaining?: number
}

export default function ManageAttendancePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [studentId, setStudentId] = useState("")
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_OUT'>('SIGN_IN')
  const [loading, setLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [stats, setStats] = useState<AttendanceStats>({
    totalSignedIn: 0,
    totalSignedOut: 0,
    currentlyPresent: 0
  })
  const [eventTimeStatus, setEventTimeStatus] = useState<EventTimeStatus | null>(null)
  
  const { toast } = useToast()

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

  const fetchEvents = useCallback(async () => {
    try {
      setEventsLoading(true)
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        // Filter for active/upcoming events
        const activeEvents = data.events.filter((event: Event) => 
          new Date(event.eventDate) >= new Date(new Date().setHours(0, 0, 0, 0))
        )
        setEvents(activeEvents)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      })
    } finally {
      setEventsLoading(false)
    }
  }, [toast])

  const fetchAttendanceStats = useCallback(async () => {
    if (!selectedEvent) return

    try {
      const response = await fetch(`/api/attendance/event/${selectedEvent.id}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching attendance stats:", error)
    }
  }, [selectedEvent])

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Fetch stats when event is selected
  useEffect(() => {
    if (selectedEvent) {
      fetchAttendanceStats()
      // Check initial event time status
      const timeStatus = checkEventTimeStatus(selectedEvent)
      setEventTimeStatus(timeStatus)
    } else {
      setEventTimeStatus(null)
    }
  }, [selectedEvent, fetchAttendanceStats])

  // Periodic update for event time status (every minute)
  useEffect(() => {
    if (!selectedEvent) return

    const interval = setInterval(() => {
      const timeStatus = checkEventTimeStatus(selectedEvent)
      setEventTimeStatus(timeStatus)
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [selectedEvent])

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEvent) {
      toast({
        title: "No Event Selected",
        description: "Please select an event first",
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

    if (!studentId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a student ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch("/api/attendance/barcode-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId.trim(),
          eventId: selectedEvent.id,
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
        
        // Refresh stats
        fetchAttendanceStats()
        
        // Clear input
        setStudentId("")
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
      setLoading(false)
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

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Attendance</h1>
            <p className="text-muted-foreground">
              Real-time student attendance tracking system
            </p>
          </div>
          <Button 
            onClick={fetchEvents} 
            variant="outline" 
            size="sm"
            disabled={eventsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
            Refresh Events
          </Button>
        </div>

        {/* Event Selection */}
        <Card className="border-2 border-blue-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Event Selection</CardTitle>
                <p className="text-sm text-gray-600">Choose an event to manage attendance</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                <span className="text-gray-600">Loading events...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="event-select" className="text-lg font-semibold text-gray-700">
                  Select Event
                </Label>
                <Select 
                  value={selectedEvent?.id || ""} 
                  onValueChange={(eventId) => {
                    const event = events.find(e => e.id === eventId)
                    setSelectedEvent(event || null)
                  }}
                >
                  <SelectTrigger className="w-full h-14 text-base border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <SelectValue placeholder="Choose an event to manage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{event.title}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(event.eventDate), "MMM dd, yyyy")} • {event.startTime} - {event.endTime}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Event Details */}
                {selectedEvent && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border">
                    <h4 className="font-semibold text-gray-800 mb-3">Event Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>{format(new Date(selectedEvent.eventDate), "EEEE, MMMM dd, yyyy")}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span>{selectedEvent.location || 'Location TBD'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span>{selectedEvent.scope_type?.replace('_', ' ') || 'University Wide'}</span>
                      </div>
                    </div>

                    {/* Event Time Status */}
                    {eventTimeStatus && (
                      <div className="mt-4">
                        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                          eventTimeStatus.isActive 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : eventTimeStatus.status === 'not-started'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {eventTimeStatus.isActive ? (
                            <Activity className="h-4 w-4" />
                          ) : eventTimeStatus.status === 'not-started' ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span>{eventTimeStatus.message}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Statistics */}
        {selectedEvent && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Signed In</p>
                    <p className="text-3xl font-bold text-green-700">{stats.totalSignedIn}</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Signed Out</p>
                    <p className="text-3xl font-bold text-red-700">{stats.totalSignedOut}</p>
                  </div>
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Currently Present</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.currentlyPresent}</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Barcode Scanner */}
        {selectedEvent && (
          <Card className="border-2 border-purple-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Scan className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-800">Barcode Scanner</CardTitle>
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
                <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="student-id" className="text-lg font-semibold text-gray-700 mb-2 block">
                      Student ID
                    </Label>
                    <div className="flex space-x-3">
                      <Input
                        id="student-id"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={studentId}
                        onChange={(e) => {
                          // Allow only numbers
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          setStudentId(value)
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
                        disabled={Boolean(loading || !studentId.trim() || (eventTimeStatus && !eventTimeStatus.isActive))}
                        className={`px-8 h-14 text-base font-semibold transition-all duration-200 ${
                          mode === 'SIGN_IN' 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {mode === 'SIGN_IN' ? (
                              <CheckCircle className="h-5 w-5 mr-2" />
                            ) : (
                              <XCircle className="h-5 w-5 mr-2" />
                            )}
                            {mode === 'SIGN_IN' ? 'Sign In' : 'Sign Out'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>

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
        )}
      </div>
    </DashboardShell>
  )
} 