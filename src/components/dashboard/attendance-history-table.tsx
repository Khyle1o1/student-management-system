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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  RefreshCw,
  Calendar,
  Clock,
  User,
  Download,
  Filter,
  Eye
} from "lucide-react"

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  studentNumber: string
  course: string
  yearLevel: string
  section: string
  eventId: string
  eventTitle: string
  eventDate: string
  timeIn?: string
  timeOut?: string
  status: string
  scannedIn: boolean
  scannedOut: boolean
  createdAt: string
}

interface Event {
  id: string
  title: string
  eventDate: string
  eventType: string
  status: string
}

export function AttendanceHistoryTable() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [eventFilter, setEventFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = attendanceRecords.filter((record) => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        record.studentName.toLowerCase().includes(searchLower) ||
        record.studentNumber.toLowerCase().includes(searchLower) ||
        record.course.toLowerCase().includes(searchLower) ||
        record.eventTitle.toLowerCase().includes(searchLower)

      const matchesEvent = eventFilter === "all" || record.eventId === eventFilter
      const matchesStatus = statusFilter === "all" || record.status.toLowerCase() === statusFilter.toLowerCase()
      const matchesDate = !dateFilter || record.eventDate === dateFilter

      return matchesSearch && matchesEvent && matchesStatus && matchesDate
    })
    
    setFilteredRecords(filtered)
  }, [searchTerm, eventFilter, statusFilter, dateFilter, attendanceRecords])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch all attendance records
      const attendanceResponse = await fetch("/api/attendance/history")
      const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : []
      
      // Fetch all events for filtering
      const eventsResponse = await fetch("/api/events")
      const eventsData = eventsResponse.ok ? await eventsResponse.json() : []
      
      setAttendanceRecords(attendanceData)
      setEvents(eventsData)
      setFilteredRecords(attendanceData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportFilteredData = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...(eventFilter !== "all" && { eventId: eventFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(dateFilter && { date: dateFilter }),
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`/api/attendance/history/export?${queryParams}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `attendance-history-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (time?: string) => {
    if (!time) return "-"
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present": return "bg-green-100 text-green-800"
      case "partial": return "bg-yellow-100 text-yellow-800"
      case "absent": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getAttendanceDuration = (timeIn?: string, timeOut?: string) => {
    if (!timeIn || !timeOut) return "-"
    
    const inTime = new Date(`2000-01-01T${timeIn}`)
    const outTime = new Date(`2000-01-01T${timeOut}`)
    const diffMs = outTime.getTime() - inTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    }
    return `${diffMinutes}m`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading attendance history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Attendance History</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students or events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} - {formatDate(event.eventDate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
            />

            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline" onClick={exportFilteredData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Course & Year</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Time IN</TableHead>
                <TableHead>Time OUT</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {searchTerm || eventFilter !== "all" || statusFilter !== "all" || dateFilter 
                          ? "No attendance records found matching your filters." 
                          : "No attendance records found."}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">{record.studentName}</div>
                          <div className="text-sm text-gray-600">{record.section}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.studentNumber}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{record.course}</div>
                        <div className="text-gray-600">Year {record.yearLevel}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48">
                        <div className="font-medium truncate">{record.eventTitle}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(record.eventDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatTime(record.timeIn)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatTime(record.timeOut)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {getAttendanceDuration(record.timeIn, record.timeOut)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {record.scannedIn && (
                          <Badge variant="outline" className="text-xs">
                            Scanned IN
                          </Badge>
                        )}
                        {record.scannedOut && (
                          <Badge variant="outline" className="text-xs">
                            Scanned OUT
                          </Badge>
                        )}
                        {!record.scannedIn && !record.scannedOut && (
                          <Badge variant="outline" className="text-xs">
                            Manual
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredRecords.length} of {attendanceRecords.length} record(s)
          </div>
          <div className="text-sm text-muted-foreground">
            {eventFilter !== "all" && events.find(e => e.id === eventFilter) && (
              <span>Event: {events.find(e => e.id === eventFilter)?.title} • </span>
            )}
            {statusFilter !== "all" && (
              <span>Status: {statusFilter} • </span>
            )}
            {dateFilter && (
              <span>Date: {formatDate(dateFilter)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 