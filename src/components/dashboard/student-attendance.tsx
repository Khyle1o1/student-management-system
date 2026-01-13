"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Star, Award } from "lucide-react"
import Link from "next/link"

interface EventWithStatus {
  id: string
  title: string
  description: string
  date: string
  start_time?: string
  end_time?: string
  location?: string
  type?: string
  scope_type: string
  scope_college?: string
  scope_course?: string
  attendanceStatus: 'ATTENDED' | 'MISSED' | 'LATE'
  statusDetails: {
    timeIn?: string
    timeOut?: string
    recordedAt?: string
  } | null
  require_evaluation?: boolean
  evaluation_id?: string | null
}

interface AttendanceStats {
  total: number
  attended: number
  missed: number
  attendanceRate: number
}

interface StudentAttendanceProps {
  studentId: string | null
}

export function StudentAttendance({ studentId }: StudentAttendanceProps) {
  const [events, setEvents] = useState<EventWithStatus[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [evaluationStatuses, setEvaluationStatuses] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendanceData = useCallback(async () => {
    if (!studentId) return

    try {
      setLoading(true)
      setError(null)
      
      // Fetch all events with attendance status
      const response = await fetch(`/api/students/${studentId}/events-with-status?filter=all`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events data')
      }

      const eventsData = data.events || []
      setEvents(eventsData)
      setStats(data.stats)

      // Fetch evaluation statuses for attended events that require evaluation
      const attendedEvents = eventsData.filter((event: EventWithStatus) => 
        (event.attendanceStatus === 'ATTENDED' || event.attendanceStatus === 'LATE') 
        && event.require_evaluation 
        && event.evaluation_id
      )

      if (attendedEvents.length > 0) {
        const statuses: Record<string, boolean> = {}
        
        // Initialize all to false first
        attendedEvents.forEach((event: EventWithStatus) => {
          statuses[event.id] = false
        })
        
        // Check evaluation completion for each event
        for (const event of attendedEvents) {
          try {
            if (event.evaluation_id) {
              const evalResponse = await fetch(`/api/forms/${event.evaluation_id}/responses?student_id=${studentId}`)
              if (evalResponse.ok) {
                const evalData = await evalResponse.json()
                const hasSubmitted = Array.isArray(evalData.responses) && evalData.responses.length > 0
                statuses[event.id] = hasSubmitted
              } else {
                statuses[event.id] = false
              }
            }
          } catch (error) {
            console.error(`Error checking evaluation for event ${event.id}:`, error)
            statuses[event.id] = false
          }
        }
        
        setEvaluationStatuses(statuses)
      } else {
        setEvaluationStatuses({})
      }
    } catch (error: any) {
      console.error("Error fetching events data:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (studentId) {
      fetchAttendanceData()
    }
  }, [studentId, fetchAttendanceData])

  const getStatusIcon = (status: 'ATTENDED' | 'MISSED' | 'LATE') => {
    switch (status) {
      case "ATTENDED": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "MISSED": return <XCircle className="h-4 w-4 text-red-600" />
      case "LATE": return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: 'ATTENDED' | 'MISSED' | 'LATE') => {
    switch (status) {
      case "ATTENDED": return "bg-green-100 text-green-800 border-green-200"
      case "MISSED": return "bg-red-100 text-red-800 border-red-200"
      case "LATE": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const renderActionButton = (event: EventWithStatus) => {
    // Only show actions for attended events
    if (event.attendanceStatus === 'MISSED') {
      return (
        <span className="text-sm text-muted-foreground italic">
          You did not attend this event
        </span>
      )
    }

    // Check if event requires evaluation
    if (event.require_evaluation) {
      const hasCompleted = evaluationStatuses[event.id] === true
      
      if (hasCompleted) {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/certificates">
                <Award className="h-3 w-3 mr-1" />
                Certificate
              </Link>
            </Button>
          </div>
        )
      } else {
        return (
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Link href={`/dashboard/events/${event.id}/evaluation`}>
              <Star className="h-3 w-3 mr-1" />
              Evaluate
            </Link>
          </Button>
        )
      }
    }

    // For events that don't require evaluation, show certificate link
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/certificates">
          <Award className="h-3 w-3 mr-1" />
          Certificate
        </Link>
      </Button>
    )
  }

  const filteredEvents = events.filter((event) => {
    switch (activeTab) {
      case "attended":
        return event.attendanceStatus === "ATTENDED" || event.attendanceStatus === "LATE"
      case "missed":
        return event.attendanceStatus === "MISSED"
      default:
        return true
    }
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading attendance data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p className="text-red-600">Error loading attendance: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!studentId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>No student ID provided</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Attended</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.attended}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Missed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.missed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.attendanceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events with Attendance Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>My Events</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAttendanceData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                <Calendar className="h-4 w-4 mr-2" />
                All ({events.length})
              </TabsTrigger>
              <TabsTrigger value="attended">
                <CheckCircle className="h-4 w-4 mr-2" />
                Attended ({stats?.attended || 0})
              </TabsTrigger>
              <TabsTrigger value="missed">
                <XCircle className="h-4 w-4 mr-2" />
                Missed ({stats?.missed || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>
                    {activeTab === 'attended' && 'No events attended yet'}
                    {activeTab === 'missed' && 'Great! No events missed'}
                    {activeTab === 'all' && 'No events found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{event.title}</p>
                              {event.description && (
                                <p className="text-sm text-gray-500">{event.description}</p>
                              )}
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {event.scope_type === 'UNIVERSITY_WIDE' && '🌐 University'}
                                  {event.scope_type === 'COLLEGE_WIDE' && '🏫 College'}
                                  {event.scope_type === 'COURSE_SPECIFIC' && '📚 Course'}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {event.statusDetails?.timeIn
                              ? format(new Date(event.statusDetails.timeIn), "HH:mm")
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            {event.statusDetails?.timeOut
                              ? format(new Date(event.statusDetails.timeOut), "HH:mm")
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(event.attendanceStatus)}
                              <Badge className={getStatusColor(event.attendanceStatus)}>
                                {event.attendanceStatus}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderActionButton(event)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 