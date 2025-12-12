"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

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
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  // OPTIMIZATION: Use React Query for data fetching with automatic caching
  const { data: events = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch("/api/events", { cache: "no-store" })
      if (!response.ok) throw new Error('Failed to fetch events')
      const data = await response.json()
      return data.events || []
    },
    staleTime: 30 * 1000, // 30 seconds - data stays fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - cache time
  })

  // OPTIMIZATION: Memoize fetch function to prevent unnecessary re-renders
  const fetchEvents = useCallback(() => {
    refetch()
  }, [refetch])

  // OPTIMIZATION: Memoize filtered events to prevent unnecessary recalculations
  const filteredEvents = useMemo(() => {
    let filtered = events.filter((event: Event) => {
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
      filtered = filtered.filter((event: Event) => String(event.status).toUpperCase() === 'PENDING')
    } else if (activeTab === "active") {
      filtered = filtered.filter((event: Event) => String(event.status).toUpperCase() !== 'PENDING')
    }

    return filtered
  }, [events, searchTerm, activeTab])

  // OPTIMIZATION: Memoize counts to prevent recalculation on every render
  const pendingCount = useMemo(
    () => events.filter((e: Event) => String(e.status).toUpperCase() === 'PENDING').length,
    [events]
  )
  
  const activeCount = useMemo(
    () => events.filter((e: Event) => String(e.status).toUpperCase() !== 'PENDING').length,
    [events]
  )

  // OPTIMIZATION: Memoize delete handler and update query cache
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        cache: "no-store",
      })

      if (response.ok) {
        // Update React Query cache instead of local state
        queryClient.setQueryData(['events'], (oldData: Event[] | undefined) => 
          (oldData || []).filter((event) => event.id !== eventId)
        )
        return true
      }
      const data = await response.json().catch(() => ({}))
      await Swal.fire({
        icon: "error",
        title: "Unable to delete",
        text: data.error || "Something went wrong while deleting the event.",
        confirmButtonColor: "#dc2626",
      })
    } catch (error) {
      console.error("Error deleting event:", error)
      await Swal.fire({
        icon: "error",
        title: "Unable to delete",
        text: "Please try again in a moment.",
        confirmButtonColor: "#dc2626",
      })
    }
    return false
  }, [queryClient])

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

  const approveEvent = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'APPROVE' }) })
      if (res.ok) {
        // OPTIMIZATION: Update React Query cache
        queryClient.setQueryData(['events'], (oldData: Event[] | undefined) =>
          (oldData || []).map((event) =>
            event.id === id ? { ...event, status: "APPROVED" } : event
          )
        )
        return true
      }
      const data = await res.json().catch(() => ({}))
      await Swal.fire({
        icon: "error",
        title: "Approval failed",
        text: data.error || "We couldn't approve this event. Please try again.",
      })
    } catch (e) {
      console.error('Approve failed', e)
      await Swal.fire({
        icon: "error",
        title: "Approval failed",
        text: "Something went wrong while approving the event.",
      })
    }
    return false
  }, [queryClient])

  const rejectEvent = useCallback(async (id: string, reason: string | null) => {
    try {
      const res = await fetch(`/api/events/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REJECT', reason }) })
      if (res.ok) {
        // OPTIMIZATION: Update React Query cache
        queryClient.setQueryData(['events'], (oldData: Event[] | undefined) =>
          (oldData || []).map((event) =>
            event.id === id ? { ...event, status: "REJECTED" } : event
          )
        )
        return true
      }
      const data = await res.json().catch(() => ({}))
      await Swal.fire({
        icon: "error",
        title: "Rejection failed",
        text: data.error || "We couldn't reject this event.",
      })
    } catch (e) {
      console.error('Reject failed', e)
      await Swal.fire({
        icon: "error",
        title: "Rejection failed",
        text: "Something went wrong while rejecting the event.",
      })
    }
    return false
  }, [queryClient])

  const showProcessingAlert = (title: string) => {
    Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })
  }

  const handleDeleteClick = async (event: Event) => {
    const result = await Swal.fire({
      title: "Delete this event?",
      text: `"${event.title}" and its records will be permanently removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Event",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    showProcessingAlert("Deleting event...")
    const success = await handleDeleteEvent(event.id)
    Swal.close()

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Event deleted",
        text: `"${event.title}" has been removed.`,
        confirmButtonColor: "#0f172a",
      })
    }
  }

  const handleApproveClick = async (event: Event) => {
    const result = await Swal.fire({
      title: "Approve this event?",
      text: `Attendees will be able to access "${event.title}" once approved.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve Event",
      confirmButtonColor: "#16a34a",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    showProcessingAlert("Approving event...")
    const success = await approveEvent(event.id)
    Swal.close()

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Event approved",
        text: `"${event.title}" is now live.`,
        confirmButtonColor: "#16a34a",
      })
    }
  }

  const handleRejectClick = async (event: Event) => {
    const result = await Swal.fire({
      title: "Reject this event?",
      text: `Share an optional note so the organizer understands what to fix for "${event.title}".`,
      icon: "info",
      input: "textarea",
      inputPlaceholder: "Reason for rejection (optional)",
      inputAttributes: {
        maxlength: "500",
      },
      showCancelButton: true,
      confirmButtonText: "Reject Event",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      preConfirm: (value) => value?.trim(),
    })

    if (!result.isConfirmed) return

    showProcessingAlert("Submitting decision...")
    const success = await rejectEvent(event.id, result.value || null)
    Swal.close()

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Event rejected",
        text: result.value
          ? `Organizer note: ${result.value}`
          : `"${event.title}" has been rejected.`,
        confirmButtonColor: "#0f172a",
      })
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
          <div className="mt-3 sm:mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-1 sm:px-0">
            {filteredEvents.map((event: Event) => {
                const isPending = String(event.status).toUpperCase() === 'PENDING'
                const Wrapper: any = isPending ? 'div' : Link
                const wrapperProps = isPending 
                  ? { className: "block h-full" } 
                  : { href: `/dashboard/attendance/${event.id}`, className: "block h-full" }
                return (
                  <Wrapper key={event.id} {...wrapperProps}>
                  <Card className={`${isPending ? 'opacity-90 cursor-not-allowed' : 'hover:shadow-md cursor-pointer group'} transition-shadow duration-200 h-full w-full overflow-hidden`}>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 pr-1">
                          <CardTitle className="text-base sm:text-lg font-semibold leading-tight line-clamp-2 sm:line-clamp-1 group-hover:text-blue-600 transition-colors break-words">
                            {event.title}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 break-words">
                            {event.description || "No description provided"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 p-0 flex-shrink-0 touch-manipulation">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!isPending && (
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/attendance/${event.id}`} className="flex items-center">
                                  <UserCheck className="mr-2 h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">Manage Attendance</span>
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
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleApproveClick(event)
                                  }}
                                  className="bg-green-50 text-green-700 font-medium focus:bg-green-100 focus:text-green-800"
                                >
                                  <span>Approve</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleRejectClick(event)
                                  }}
                                  className="bg-red-50 text-red-700 font-medium focus:bg-red-100 focus:text-red-800"
                                >
                                  <span>Reject</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/events/${event.id}`} className="flex items-center">
                                <Edit className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Edit Event</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/events/${event.id}`} className="flex items-center">
                                <Eye className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">View Details</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  const response = await fetch(`/api/events/${event.id}/report`);
                                  
                                  if (!response.ok) {
                                    const error = await response.json().catch(() => ({}));
                                    if (response.status === 404) {
                                      await Swal.fire({
                                        icon: "warning",
                                        title: "Event not found",
                                        text: "The event may have been deleted. The list will be refreshed.",
                                        confirmButtonColor: "#0f172a",
                                      });
                                      fetchEvents(); // Refresh the events list
                                    } else {
                                      await Swal.fire({
                                        icon: "error",
                                        title: "Report failed",
                                        text: error.error || "Failed to generate report.",
                                        confirmButtonColor: "#dc2626",
                                      });
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

                                  await Swal.fire({
                                    icon: "success",
                                    title: "Report generated",
                                    text: "The event report PDF has been downloaded.",
                                    confirmButtonColor: "#0f172a",
                                  });
                                } catch (error) {
                                  console.error('Error generating report:', error);
                                  await Swal.fire({
                                    icon: "error",
                                    title: "Report failed",
                                    text: "Failed to generate report. Please try again.",
                                    confirmButtonColor: "#dc2626",
                                  });
                                }
                              }}
                              className="flex items-center"
                            >
                              <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate">Generate PDF Report</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault()
                                handleDeleteClick(event)
                              }}
                              className="text-red-600 flex items-center"
                            >
                              <Trash2 className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                      {/* Date and Time */}
                      <div className="flex items-start sm:items-center space-x-2 text-xs sm:text-sm">
                        <Calendar className="h-4 w-4 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium break-words">{formatEventDate(event.eventDate)}</div>
                          <div className="text-muted-foreground flex items-center space-x-1 mt-0.5">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="break-words text-xs sm:text-sm">
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-start space-x-2 text-xs sm:text-sm">
                        <MapPin className="h-4 w-4 sm:h-4 sm:w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="break-words line-clamp-2 flex-1">{event.location}</span>
                      </div>

                      {/* Badges Row */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Badge className={`${getEventTypeBadgeColor(event.eventType)} text-xs`}>
                          {event.eventType}
                        </Badge>
                        <Badge className={`${getStatusBadgeColor(event.status)} text-xs`}>
                          {event.status}
                        </Badge>
                      </div>

                      {/* Scope */}
                      <div className="flex items-start space-x-2 text-xs sm:text-sm">
                        <Target className="h-4 w-4 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <Badge className={`${getScopeBadgeColor(event.scope_type)} text-xs`} variant="outline">
                            {EVENT_SCOPE_LABELS[event.scope_type as keyof typeof EVENT_SCOPE_LABELS]}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1 break-words line-clamp-2">
                            {formatScopeDetails(event)}
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md leading-relaxed">
                          Awaiting System Administrator approval. Attendance and management are disabled until approval.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Wrapper>
                )
              })}
            </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4 mt-6 border-t">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          <Button variant="outline" onClick={fetchEvents} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-2 mb-6 bg-transparent p-0 h-auto">
            <TabsTrigger value="all" className="w-full sm:w-auto flex-1 basis-full sm:basis-auto flex items-center justify-center gap-2 text-sm min-w-0">
              <Calendar className="h-4 w-4" />
              All Events
              <Badge variant="secondary" className="ml-1">
                {events.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="w-full sm:w-auto flex-1 basis-full sm:basis-auto flex items-center justify-center gap-2 text-sm min-w-0">
              <AlertCircle className="h-4 w-4" />
              Pending
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800">
                {pendingCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="w-full sm:w-auto flex-1 basis-full sm:basis-auto flex items-center justify-center gap-2 text-sm min-w-0">
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