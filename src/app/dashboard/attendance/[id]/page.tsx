"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

interface Event {
  id: string
  title: string
  description: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  allowMultipleEntries: boolean
}

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  timeIn: string
  timeOut: string | null
  status: "PRESENT" | "SIGNED_OUT" | "NO_TIMEOUT"
}

export default function EventAttendancePage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)

  const fetchEventDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setEvent(data)
    } catch (error) {
      console.error("Error fetching event details:", error)
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      })
    }
  }, [id, toast])

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/attendance/event/${id}/records`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setAttendanceRecords(data.records)
    } catch (error) {
      console.error("Error fetching attendance records:", error)
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    fetchEventDetails()
    fetchAttendanceRecords()
  }, [fetchEventDetails, fetchAttendanceRecords])

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    try {
      const response = await fetch(`/api/attendance/event/${id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: barcodeInput }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Show success toast
      toast({
        title: "Success",
        description: `✅ ${data.studentName} has successfully signed ${
          data.action
        } at ${format(new Date(), "HH:mm")}`,
      })

      // Refresh attendance records
      fetchAttendanceRecords()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `❌ ${error.message || "Failed to record attendance"}`,
        variant: "destructive",
      })
    }

    setBarcodeInput("")
  }

  const filteredRecords = attendanceRecords.filter((record) => {
    switch (activeTab) {
      case "present":
        return record.status === "PRESENT"
      case "signed-out":
        return record.status === "SIGNED_OUT"
      case "no-timeout":
        return record.status === "NO_TIMEOUT"
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800">Event not found</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{event.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Date</p>
              <p>{format(new Date(event.eventDate), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Time</p>
              <p>{`${event.startTime} - ${event.endTime}`}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Location</p>
              <p>{event.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBarcodeSubmit} className="flex space-x-4">
            <Input
              type="text"
              placeholder="Scan student barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button type="submit">Record</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="present">Present</TabsTrigger>
              <TabsTrigger value="signed-out">Signed Out</TabsTrigger>
              <TabsTrigger value="no-timeout">No Time Out</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.studentId}</TableCell>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{format(new Date(record.timeIn), "HH:mm")}</TableCell>
                      <TableCell>
                        {record.timeOut
                          ? format(new Date(record.timeOut), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === "PRESENT"
                              ? "bg-green-100 text-green-800"
                              : record.status === "SIGNED_OUT"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {record.status.replace("_", " ")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 