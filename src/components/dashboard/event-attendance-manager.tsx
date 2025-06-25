"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Calendar,
  Clock,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Plus
} from "lucide-react"
import Link from "next/link"
import { EventAttendanceTable } from "./event-attendance-table"

interface Event {
  id: string
  title: string
  description: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  eventType: string
  capacity: number
  registeredCount: number
  status: string
}

export function EventAttendanceManager() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        // Filter only upcoming and ongoing events for attendance
        const activeEvents = data.filter((event: Event) => 
          event.status === "upcoming" || event.status === "ongoing"
        )
        setEvents(activeEvents)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEventSelect = (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    setSelectedEvent(event || null)
  }

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEventStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "upcoming": return "bg-blue-100 text-blue-800"
      case "ongoing": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading events...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold">No Active Events Found</h3>
              <p className="text-muted-foreground mt-2">
                You need to create an event before you can take attendance. Events must have "upcoming" or "ongoing" status.
              </p>
            </div>
            <Link href="/dashboard/events/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Event
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Event Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Select Event for Attendance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Choose Event</label>
                <Select value={selectedEvent?.id || ""} onValueChange={handleEventSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event to take attendance" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{event.title}</span>
                          <span className="text-sm text-gray-600">
                            {formatEventDate(event.eventDate)} • {event.eventType}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={fetchEvents}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Events
                </Button>
                <Link href="/dashboard/events/new">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </Link>
              </div>
            </div>

            {selectedEvent && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Selected Event Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <h4 className="font-semibold text-base">{selectedEvent.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedEvent.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{formatEventDate(selectedEvent.eventDate)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedEvent.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{selectedEvent.capacity} capacity</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={getEventStatusColor(selectedEvent.status)}>
                      {selectedEvent.status}
                    </Badge>
                    <Badge variant="outline">
                      {selectedEvent.eventType}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Management Section */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Attendance for "{selectedEvent.title}"</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EventAttendanceTable eventId={selectedEvent.id} eventDetails={selectedEvent} />
          </CardContent>
        </Card>
      )}
    </div>
  )
} 