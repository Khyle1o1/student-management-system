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

interface AttendanceRecord {
  id: string
  student_id: string
  time_in: string
  time_out: string | null
  status: string
  mode: string
  created_at: string
  event: {
    id: string
    title: string
    description: string
    date: string
    require_evaluation?: boolean
  }
  evaluation_completed?: boolean
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  rate: number
}

interface StudentAttendanceProps {
  studentId: string | null
}

export function StudentAttendance({ studentId }: StudentAttendanceProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
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
      const response = await fetch(`/api/students/attendance/${studentId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attendance data')
      }

      const records = data.attendance || []
      setAttendanceRecords(records)
      
      // Calculate stats
      const total = records.length
      const present = records.filter((r: AttendanceRecord) => r.status === 'PRESENT').length
      const absent = records.filter((r: AttendanceRecord) => r.status === 'ABSENT').length
      const late = records.filter((r: AttendanceRecord) => r.status === 'LATE').length
      const rate = total > 0 ? Math.round((present / total) * 100) : 0

      setStats({ total, present, absent, late, rate })

      // Fetch evaluation statuses for attended events that require evaluation
      const attendedEvents = records.filter((r: AttendanceRecord) => 
        r.status === 'PRESENT' && r.event.require_evaluation && r.event.evaluation_id
      )

      if (attendedEvents.length > 0) {
        const statuses: Record<string, boolean> = {}
        
        // Initialize all to false first
        attendedEvents.forEach((record) => {
          statuses[record.event.id] = false
        })
        
        // Check evaluation completion for each event
        for (const record of attendedEvents) {
          try {
            // Get the evaluation form ID for this event
            if (record.event.evaluation_id) {
              // Use student_id parameter to check if student has submitted
              const evalResponse = await fetch(`/api/forms/${record.event.evaluation_id}/responses?student_id=${studentId}`)
              if (evalResponse.ok) {
                const evalData = await evalResponse.json()
                // Check if there are any responses (the API filters by student_id)
                // Make sure we're checking the response array properly
                const hasSubmitted = Array.isArray(evalData.responses) && evalData.responses.length > 0
                statuses[record.event.id] = hasSubmitted
                console.log(`Evaluation status for event ${record.event.id}: ${hasSubmitted ? 'COMPLETED' : 'NOT COMPLETED'}`, {
                  eventId: record.event.id,
                  evaluationId: record.event.evaluation_id,
                  studentId: studentId,
                  responseCount: evalData.responses?.length || 0,
                  hasSubmitted
                })
              } else {
                // If API call fails, assume not completed
                statuses[record.event.id] = false
                console.log(`Evaluation check failed for event ${record.event.id}:`, evalResponse.status)
              }
            } else {
              // No evaluation_id means no evaluation required
              statuses[record.event.id] = false
            }
          } catch (error) {
            console.error(`Error checking evaluation for event ${record.event.id}:`, error)
            // On error, assume not completed
            statuses[record.event.id] = false
          }
        }
        
        setEvaluationStatuses(statuses)
      } else {
        // If no events require evaluation, clear the statuses
        setEvaluationStatuses({})
      }
    } catch (error: any) {
      console.error("Error fetching attendance data:", error)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "ABSENT": return <XCircle className="h-4 w-4 text-red-600" />
      case "LATE": return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-800"
      case "ABSENT": return "bg-red-100 text-red-800"
      case "LATE": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const renderActionButton = (record: AttendanceRecord) => {
    // Only show actions for attended events (PRESENT status)
    if (record.status !== 'PRESENT') {
      return <span className="text-muted-foreground text-sm">-</span>
    }

    // Check if event requires evaluation
    if (record.event.require_evaluation) {
      // Explicitly check if the evaluation status exists and is true
      // Default to false if not found (safer approach)
      const hasCompleted = evaluationStatuses[record.event.id] === true
      
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
            <Link href={`/dashboard/events/${record.event.id}/evaluation`}>
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

  const filteredRecords = attendanceRecords.filter((record) => {
    switch (activeTab) {
      case "present":
        return record.status === "PRESENT"
      case "absent":
        return record.status === "ABSENT"
      case "late":
        return record.status === "LATE"
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
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Late</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Attendance History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({attendanceRecords.length})</TabsTrigger>
              <TabsTrigger value="present">Present ({stats?.present || 0})</TabsTrigger>
              <TabsTrigger value="late">Late ({stats?.late || 0})</TabsTrigger>
              <TabsTrigger value="absent">Absent ({stats?.absent || 0})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No attendance records found</p>
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
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.event.title}</p>
                              {record.event.description && (
                                <p className="text-sm text-gray-500">{record.event.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.event.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {record.time_in 
                              ? format(new Date(record.time_in), "HH:mm")
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            {record.time_out
                              ? format(new Date(record.time_out), "HH:mm")
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(record.status)}
                              <Badge className={getStatusColor(record.status)}>
                                {record.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderActionButton(record)}
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