"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Calendar,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  Target
} from "lucide-react"
import Link from "next/link"
import { EVENT_SCOPE_LABELS } from "@/lib/constants/academic-programs"

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
  scope_type: string
  scope_college: string | null
  scope_course: string | null
  createdAt: string
  updatedAt: string
}

export function EventsTable() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
        setFilteredEvents(data.events || [])
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      // Set empty arrays in case of error to prevent map errors
      setEvents([])
      setFilteredEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    const filtered = events.filter((event) => {
      const searchLower = searchTerm.toLowerCase()
      
      return event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower) ||
        event.eventType.toLowerCase().includes(searchLower) ||
        (event.scope_college && event.scope_college.toLowerCase().includes(searchLower)) ||
        (event.scope_course && event.scope_course.toLowerCase().includes(searchLower))
    })
    setFilteredEvents(filtered)
  }, [searchTerm, events])

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchEvents() // Refresh the list
      } else {
        alert("Error deleting event")
      }
    } catch (error) {
      console.error("Error deleting event:", error)
      alert("Error deleting event")
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "upcoming": return "bg-blue-100 text-blue-800"
      case "ongoing": return "bg-green-100 text-green-800"
      case "completed": return "bg-gray-100 text-gray-800"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getEventTypeBadgeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "academic": return "bg-purple-100 text-purple-800"
      case "sports": return "bg-orange-100 text-orange-800"
      case "cultural": return "bg-pink-100 text-pink-800"
      case "social": return "bg-yellow-100 text-yellow-800"
      case "workshop": return "bg-indigo-100 text-indigo-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getScopeBadgeColor = (scopeType: string) => {
    switch (scopeType) {
      case "UNIVERSITY_WIDE": return "bg-green-100 text-green-800"
      case "COLLEGE_WIDE": return "bg-blue-100 text-blue-800"
      case "COURSE_SPECIFIC": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const formatScopeDetails = (event: Event) => {
    switch (event.scope_type) {
      case "UNIVERSITY_WIDE":
        return "All students"
      case "COLLEGE_WIDE":
        return event.scope_college || "College-wide"
      case "COURSE_SPECIFIC":
        return event.scope_course || "Course-specific"
      default:
        return "Unknown scope"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={fetchEvents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Details</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {searchTerm ? "No events found matching your search." : "No events found."}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-sm text-gray-600 truncate max-w-xs">
                          {event.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <div className="text-sm">
                          <div>{formatEventDate(event.eventDate)}</div>
                          <div className="text-gray-600 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEventTypeBadgeColor(event.eventType)}>
                        {event.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <Badge className={getScopeBadgeColor(event.scope_type)}>
                          <Target className="h-3 w-3 mr-1" />
                          {EVENT_SCOPE_LABELS[event.scope_type as keyof typeof EVENT_SCOPE_LABELS]}
                        </Badge>
                        <div className="text-xs text-gray-600 truncate max-w-32">
                          {formatScopeDetails(event)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <div className="text-sm">
                          <div>{event.registeredCount}/{event.capacity || "∞"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(event.status)}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/events/${event.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} event(s)
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 