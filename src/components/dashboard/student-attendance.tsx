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
  Search, 
  Calendar, 
  Clock, 
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Award
} from "lucide-react"

interface AttendanceRecord {
  id: string
  status: string
  timestamp: string
  notes?: string
  scannedAt?: string
  event: {
    id: string
    title: string
    description?: string
    type: string
    date: string
    startTime: string
    endTime?: string
    location: string
  }
}

interface AttendanceStats {
  totalEvents: number
  presentCount: number
  absentCount: number
  lateCount: number
  attendanceRate: number
}

interface StudentAttendanceProps {
  studentId: string | null
}

export function StudentAttendance({ studentId }: StudentAttendanceProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    if (studentId) {
      fetchAttendance()
    }
  }, [studentId])

  useEffect(() => {
    const filtered = attendanceRecords.filter((record) => {
      const searchLower = searchTerm.toLowerCase()
      return record.event.title.toLowerCase().includes(searchLower) ||
        record.event.type.toLowerCase().includes(searchLower) ||
        record.event.location.toLowerCase().includes(searchLower)
    })
    setFilteredRecords(filtered)
  }, [searchTerm, attendanceRecords])

  const fetchAttendance = async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/students/attendance/${studentId}`)
      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data.records || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error("Error fetching attendance:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PRESENT: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      ABSENT: { color: "bg-red-100 text-red-800", icon: XCircle },
      LATE: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      EXCUSED: { color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ABSENT
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  }

  const getEventTypeBadge = (type: string) => {
    const typeColors = {
      ACADEMIC: "bg-purple-100 text-purple-800",
      EXTRACURRICULAR: "bg-orange-100 text-orange-800",
      WORKSHOP: "bg-indigo-100 text-indigo-800",
      SEMINAR: "bg-pink-100 text-pink-800",
      MEETING: "bg-gray-100 text-gray-800",
      OTHER: "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || typeColors.OTHER}>
        {type.replace('_', ' ')}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading attendance records...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Attendance Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{stats.presentCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{stats.absentCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.attendanceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Attendance History</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" onClick={fetchAttendance}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search terms." : "You haven't attended any events yet."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scanned At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.event.title}</p>
                          {record.event.description && (
                            <p className="text-sm text-gray-600 truncate max-w-xs">
                              {record.event.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getEventTypeBadge(record.event.type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(record.event.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatTime(record.event.startTime)}</span>
                          {record.event.endTime && (
                            <span className="text-gray-400">
                              - {formatTime(record.event.endTime)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{record.event.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell>
                        {record.scannedAt ? (
                          <div className="text-sm">
                            <div>{formatDate(record.scannedAt)}</div>
                            <div className="text-gray-500">{formatTime(record.scannedAt)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 