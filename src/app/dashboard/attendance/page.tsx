"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  BarChart3,
  Loader2
} from "lucide-react"
import Link from "next/link"

interface Event {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  type: string
  status: string
  scope_type: string
  scope_college?: string
  scope_course?: string
  attendance_stats?: {
    total_present: number
    total_eligible: number
    attendance_rate: number
  }
}

interface AttendanceOverview {
  totalEvents: number
  activeEvents: number
  completedEvents: number
  totalAttendance: number
  averageRate: number
}

export default function AttendancePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [overview, setOverview] = useState<AttendanceOverview>({
    totalEvents: 0,
    activeEvents: 0,
    completedEvents: 0,
    totalAttendance: 0,
    averageRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
        
        // Calculate overview stats
        const now = new Date()
        const totalEvents = data.events?.length || 0
        const activeEvents = data.events?.filter((event: Event) => {
          const eventDate = new Date(event.date)
          const eventStart = new Date(eventDate)
          const [startHour, startMinute] = event.start_time.split(':').map(Number)
          eventStart.setHours(startHour, startMinute, 0, 0)
          
          const eventEnd = new Date(eventDate)
          const [endHour, endMinute] = event.end_time.split(':').map(Number)
          eventEnd.setHours(endHour, endMinute, 59, 999)
          
          return now >= eventStart && now <= eventEnd
        }).length || 0
        
        const completedEvents = data.events?.filter((event: Event) => {
          const eventDate = new Date(event.date)
          const eventEnd = new Date(eventDate)
          const [endHour, endMinute] = event.end_time.split(':').map(Number)
          eventEnd.setHours(endHour, endMinute, 59, 999)
          
          return now > eventEnd
        }).length || 0

        setOverview({
          totalEvents,
          activeEvents,
          completedEvents,
          totalAttendance: 0, // Will be calculated from individual event stats
          averageRate: 0 // Will be calculated from individual event stats
        })
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getEventStatus = (event: Event) => {
    const now = new Date()
    const eventDate = new Date(event.date)
    const eventStart = new Date(eventDate)
    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    eventStart.setHours(startHour, startMinute, 0, 0)
    
    const eventEnd = new Date(eventDate)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)
    eventEnd.setHours(endHour, endMinute, 59, 999)
    
    if (now < eventStart) {
      return { status: "upcoming", label: "Upcoming", color: "bg-blue-100 text-blue-800" }
    } else if (now >= eventStart && now <= eventEnd) {
      return { status: "active", label: "Active", color: "bg-green-100 text-green-800" }
    } else {
      return { status: "completed", label: "Completed", color: "bg-gray-100 text-gray-800" }
    }
  }

  const filteredEvents = events.filter(event => {
    const eventStatus = getEventStatus(event)
    if (activeTab === "all") return true
    if (activeTab === "active") return eventStatus.status === "active"
    if (activeTab === "upcoming") return eventStatus.status === "upcoming"
    if (activeTab === "completed") return eventStatus.status === "completed"
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
        <p className="text-muted-foreground">
          Manage attendance tracking for all events and view attendance statistics
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.activeEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overview.completedEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events/new">
              <Button size="sm" className="w-full">
                Create Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Events Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Event Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Events ({events.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({events.filter(e => getEventStatus(e).status === "active").length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({events.filter(e => getEventStatus(e).status === "upcoming").length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({events.filter(e => getEventStatus(e).status === "completed").length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No events found</p>
                  <Link href="/dashboard/events/new">
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredEvents.map((event) => {
                    const eventStatus = getEventStatus(event)
                    return (
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-lg">{event.title}</h3>
                                <Badge className={eventStatus.color}>
                                  {eventStatus.label}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Date:</span> {new Date(event.date).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="font-medium">Time:</span> {event.start_time} - {event.end_time}
                                </div>
                                <div>
                                  <span className="font-medium">Type:</span> {event.type}
                                </div>
                                <div>
                                  <span className="font-medium">Scope:</span> {event.scope_type.replace('_', ' ')}
                                </div>
                              </div>
                              
                              {event.attendance_stats && (
                                <div className="mt-3 flex items-center space-x-4 text-sm">
                                  <div className="flex items-center space-x-1">
                                    <Users className="h-4 w-4" />
                                    <span>{event.attendance_stats.total_present} / {event.attendance_stats.total_eligible}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <BarChart3 className="h-4 w-4" />
                                    <span>{event.attendance_stats.attendance_rate}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-2">
                              <Link href={`/dashboard/attendance/${event.id}`}>
                                <Button variant="outline" size="sm">
                                  Manage Attendance
                                </Button>
                              </Link>
                              <Link href={`/dashboard/events/${event.id}`}>
                                <Button variant="ghost" size="sm">
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
