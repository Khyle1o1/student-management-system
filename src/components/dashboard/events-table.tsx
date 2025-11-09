"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Target,
  Eye,
  UserCheck,
  FileText,
  CheckCircle,
  AlertCircle
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
  const [activeTab, setActiveTab] = useState<string>("all")

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
    let filtered = events.filter((event) => {
      const searchLower = searchTerm.toLowerCase()
      
      return event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower) ||
        event.eventType.toLowerCase().includes(searchLower) ||
        (event.scope_college && event.scope_college.toLowerCase().includes(searchLower)) ||
        (event.scope_course && event.scope_course.toLowerCase().includes(searchLower))
    })

    // Apply tab filter
    if (activeTab === "pending") {
      filtered = filtered.filter(event => String(event.status).toUpperCase() === 'PENDING')
    } else if (activeTab === "active") {
      filtered = filtered.filter(event => String(event.status).toUpperCase() !== 'PENDING')
    }

    setFilteredEvents(filtered)
  }, [searchTerm, events, activeTab])

  // Count events by status
  const pendingCount = events.filter(e => String(e.status).toUpperCase() === 'PENDING').length
  const activeCount = events.filter(e => String(e.status).toUpperCase() !== 'PENDING').length

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
      case "upcoming": return "bg-blue-100 text-blue-800 border-blue-200"
      case "ongoing": return "bg-green-100 text-green-800 border-green-200"
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200"
      case "pending": return "bg-purple-100 text-purple-800 border-purple-200"
      case "approved": return "bg-green-100 text-green-800 border-green-200"
      case "rejected": return "bg-red-100 text-red-800 border-red-200"
      case "cancelled": return "bg-red-100 text-red-800 border-red-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getEventTypeBadgeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "academic": return "bg-purple-100 text-purple-800 border-purple-200"
      case "sports": return "bg-orange-100 text-orange-800 border-orange-200"
      case "cultural": return "bg-pink-100 text-pink-800 border-pink-200"
      case "social": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "workshop": return "bg-indigo-100 text-indigo-800 border-indigo-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getScopeBadgeColor = (scopeType: string) => {
    switch (scopeType) {
      case "UNIVERSITY_WIDE": return "bg-green-100 text-green-800 border-green-200"
      case "COLLEGE_WIDE": return "bg-blue-100 text-blue-800 border-blue-200"
      case "COURSE_SPECIFIC": return "bg-purple-100 text-purple-800 border-purple-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
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

  const approveEvent = async (id: string) => {
    if (!confirm('Approve this event?')) return
    try {
      const res = await fetch(`/api/events/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'APPROVE' }) })
      if (res.ok) {
        await fetchEvents()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to approve event')
      }
    } catch (e) {
      console.error('Approve failed', e)
      alert('Approve failed')
    }
  }

  const rejectEvent = async (id: string) => {
    const reason = window.prompt('Enter rejection reason (optional):') || null
    try {
      const res = await fetch(`/api/events/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REJECT', reason }) })
      if (res.ok) {
        await fetchEvents()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to reject event')
      }
    } catch (e) {
      console.error('Reject failed', e)
      alert('Reject failed')
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

  const renderEventsList = () => (
    <>
      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? "No events found" : activeTab === "pending" ? "No pending events" : activeTab === "active" ? "No active events" : "No events yet"}
          </h3>
          <p className="text-muted-foreground max-w-sm">
            {searchTerm 
              ? "Try adjusting your search terms to find what you're looking for." 
              : activeTab === "pending" 
              ? "There are no events awaiting approval."
              : activeTab === "active"
              ? "There are no active or approved events."
              : "Create your first event to get started with event management."
            }
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => {
                const isPending = String(event.status).toUpperCase() === 'PENDING'
                const Wrapper: any = isPending ? 'div' : Link
                const wrapperProps = isPending ? {} : { href: `/dashboard/attendance/${event.id}` }
                return (
                  <Wrapper key={event.id} {...wrapperProps}>
                  <Card className={`${isPending ? 'opacity-90 cursor-not-allowed' : 'hover:shadow-md cursor-pointer group'} transition-shadow duration-200`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold leading-tight truncate group-hover:text-blue-600 transition-colors">
                            {event.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {event.description || "No description provided"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!isPending && (
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/attendance/${event.id}`}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Manage Attendance
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {/* Admin-only actions for pending events */}
                            {typeof window !== 'undefined' && (window as any).__NEXT_DATA__ && (
                              <>
                              </>
                            )}
                            {/* Render Approve/Reject if event is pending; actual role gating is handled by API */}
                            {String(event.status).toUpperCase() === 'PENDING' && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); approveEvent(event.id) }} className="bg-green-50 text-green-700 font-medium focus:bg-green-100 focus:text-green-800">
                                  <span>Approve</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); rejectEvent(event.id) }} className="bg-red-50 text-red-700 font-medium focus:bg-red-100 focus:text-red-800">
                                  <span>Reject</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/events/${event.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Event
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/events/${event.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  const response = await fetch(`/api/events/${event.id}/report`);
                                  
                                  if (!response.ok) {
                                    const error = await response.json();
                                    if (response.status === 404) {
                                      alert('Event not found. The event may have been deleted. Please refresh the page.');
                                      fetchEvents(); // Refresh the events list
                                    } else {
                                      alert(`Failed to generate report: ${error.error || 'Unknown error'}`);
                                    }
                                    return;
                                  }
                                  
                                  // Download the PDF
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `event-report-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } catch (error) {
                                  console.error('Error generating report:', error);
                                  alert('Failed to generate report. Please try again.');
                                }
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generate PDF Report
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteEvent(event.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Date and Time */}
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{formatEventDate(event.eventDate)}</div>
                          <div className="text-muted-foreground flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>

                      {/* Badges Row */}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getEventTypeBadgeColor(event.eventType)}>
                          {event.eventType}
                        </Badge>
                        <Badge className={getStatusBadgeColor(event.status)}>
                          {event.status}
                        </Badge>
                      </div>

                      {/* Scope */}
                      <div className="flex items-start space-x-2 text-sm">
                        <Target className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <Badge className={getScopeBadgeColor(event.scope_type)} variant="outline">
                            {EVENT_SCOPE_LABELS[event.scope_type as keyof typeof EVENT_SCOPE_LABELS]}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {formatScopeDetails(event)}
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="text-xs text-gray-500">
                          Awaiting System Administrator approval. Attendance and management are disabled until approval.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Wrapper>
                )
              })}
            </div>
            
          <div className="flex items-center justify-between space-x-2 py-4 mt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {filteredEvents.length} of {events.length} event(s)
            </div>
          </div>
        </>
      )}
    </>
  )

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              All Events
              <Badge variant="secondary" className="ml-1">
                {events.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800">
                {pendingCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Active/Approved
              <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800">
                {activeCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {renderEventsList()}
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
            {renderEventsList()}
          </TabsContent>

          <TabsContent value="active" className="mt-0">
            {renderEventsList()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 