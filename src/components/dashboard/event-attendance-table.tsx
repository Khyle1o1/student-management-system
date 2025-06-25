"use client"

import { useState, useEffect } from "react"
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
  User,
  RefreshCw,
  LogIn,
  LogOut,
  Clock,
  QrCode,
  Download
} from "lucide-react"

interface Student {
  id: string
  studentId: string
  firstName: string
  lastName: string
  middleName?: string
  course: string
  yearLevel: string
  section: string
}

interface EventAttendance {
  id?: string
  studentId: string
  eventId: string
  timeIn?: string
  timeOut?: string
  status: 'present' | 'absent' | 'partial'
  scannedIn: boolean
  scannedOut: boolean
  createdAt?: string
  updatedAt?: string
}

interface Event {
  id: string
  title: string
  eventDate: string
  startTime: string
  endTime: string
}

interface EventAttendanceTableProps {
  eventId: string
  eventDetails: Event
}

export function EventAttendanceTable({ eventId, eventDetails }: EventAttendanceTableProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<EventAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanInput, setScanInput] = useState("")

  useEffect(() => {
    fetchStudentsAndAttendance()
  }, [eventId])

  useEffect(() => {
    const filtered = students.filter((student) => {
      const fullName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`.toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      
      return fullName.includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower) ||
        student.course.toLowerCase().includes(searchLower) ||
        student.section.toLowerCase().includes(searchLower)
    })
    setFilteredStudents(filtered)
  }, [searchTerm, students])

  const fetchStudentsAndAttendance = async () => {
    try {
      setLoading(true)
      // Fetch all students
      const studentsResponse = await fetch("/api/students")
      const studentsData = await studentsResponse.json()
      
      // Fetch attendance for this event
      const attendanceResponse = await fetch(`/api/attendance/event/${eventId}`)
      const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : []
      
      setStudents(studentsData)
      setAttendanceRecords(attendanceData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStudentAttendance = (studentId: string): EventAttendance | undefined => {
    return attendanceRecords.find(record => record.studentId === studentId)
  }

  const markAttendance = async (studentId: string, type: 'in' | 'out') => {
    try {
      const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5) // HH:MM format
      const existingRecord = getStudentAttendance(studentId)
      
      let payload: Partial<EventAttendance>
      
      if (existingRecord) {
        // Update existing record
        payload = {
          ...existingRecord,
          [type === 'in' ? 'timeIn' : 'timeOut']: currentTime,
          [type === 'in' ? 'scannedIn' : 'scannedOut']: true,
          status: type === 'in' ? 'present' : (existingRecord.timeIn ? 'present' : 'partial')
        }
        
        const response = await fetch(`/api/attendance/event/${eventId}/${existingRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        
        if (response.ok) {
          await fetchStudentsAndAttendance()
        }
      } else {
        // Create new record
        payload = {
          studentId,
          eventId,
          [type === 'in' ? 'timeIn' : 'timeOut']: currentTime,
          [type === 'in' ? 'scannedIn' : 'scannedOut']: true,
          [type === 'in' ? 'scannedOut' : 'scannedIn']: false,
          status: type === 'in' ? 'present' : 'partial'
        }
        
        const response = await fetch(`/api/attendance/event/${eventId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        
        if (response.ok) {
          await fetchStudentsAndAttendance()
        }
      }
    } catch (error) {
      console.error("Error marking attendance:", error)
    }
  }

  const handleBarcodeScanning = async () => {
    if (!scanInput.trim()) return
    
    // Find student by ID
    const student = students.find(s => s.studentId === scanInput.trim())
    if (!student) {
      alert("Student not found!")
      setScanInput("")
      return
    }

    const existingRecord = getStudentAttendance(student.id)
    
    // Determine if this should be IN or OUT
    const isTimeIn = !existingRecord || !existingRecord.timeIn
    
    await markAttendance(student.id, isTimeIn ? 'in' : 'out')
    setScanInput("")
  }

  const exportAttendance = async () => {
    try {
      const response = await fetch(`/api/attendance/event/${eventId}/export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `attendance-${eventDetails.title}-${eventDetails.eventDate}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting attendance:", error)
    }
  }

  const formatStudentName = (student: Student) => {
    const middleName = student.middleName ? ` ${student.middleName}` : ''
    return `${student.firstName}${middleName} ${student.lastName}`
  }

  const formatTime = (time?: string) => {
    if (!time) return "-"
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getAttendanceStatus = (attendance?: EventAttendance) => {
    if (!attendance) return { status: 'absent', color: 'bg-gray-100 text-gray-800' }
    if (attendance.timeIn && attendance.timeOut) return { status: 'present', color: 'bg-green-100 text-green-800' }
    if (attendance.timeIn && !attendance.timeOut) return { status: 'partial', color: 'bg-yellow-100 text-yellow-800' }
    return { status: 'absent', color: 'bg-red-100 text-red-800' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2 p-8">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Loading students and attendance data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 border rounded-lg p-2">
            <QrCode className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Scan student ID or type manually"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScanning()}
              className="border-0 focus:ring-0 w-48"
            />
            <Button size="sm" onClick={handleBarcodeScanning} disabled={!scanInput.trim()}>
              Scan
            </Button>
          </div>
          
          <Button variant="outline" onClick={fetchStudentsAndAttendance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={exportAttendance}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Course & Year</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Time IN</TableHead>
              <TableHead>Time OUT</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {searchTerm ? "No students found matching your search." : "No students found."}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => {
                const attendance = getStudentAttendance(student.id)
                const statusInfo = getAttendanceStatus(attendance)
                
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{formatStudentName(student)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.studentId}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{student.course}</div>
                        <div className="text-gray-600">Year {student.yearLevel}</div>
                      </div>
                    </TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatTime(attendance?.timeIn)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatTime(attendance?.timeOut)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo.color}>
                        {statusInfo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          size="sm"
                          variant={attendance?.timeIn ? "outline" : "default"}
                          onClick={() => markAttendance(student.id, 'in')}
                          disabled={!!attendance?.timeIn}
                        >
                          <LogIn className="h-3 w-3 mr-1" />
                          IN
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance?.timeOut ? "outline" : "default"}
                          onClick={() => markAttendance(student.id, 'out')}
                          disabled={!attendance?.timeIn || !!attendance?.timeOut}
                        >
                          <LogOut className="h-3 w-3 mr-1" />
                          OUT
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {attendanceRecords.filter(r => r.timeIn && r.timeOut).length}
          </div>
          <div className="text-sm text-green-700">Fully Attended</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {attendanceRecords.filter(r => r.timeIn && !r.timeOut).length}
          </div>
          <div className="text-sm text-yellow-700">Checked IN Only</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {students.length - attendanceRecords.filter(r => r.timeIn).length}
          </div>
          <div className="text-sm text-red-700">Absent</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {students.length}
          </div>
          <div className="text-sm text-blue-700">Total Students</div>
        </div>
      </div>
    </div>
  )
} 