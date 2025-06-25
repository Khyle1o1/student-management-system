"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, CheckCircle, XCircle } from "lucide-react"

interface StudentDashboardProps {
  studentId: string | null
}

// Mock data - in real app, this would come from API
const studentData = {
  attendanceRate: 85,
  totalEvents: 20,
  attendedEvents: 17,
  totalFees: 1200,
  paidFees: 800,
  pendingFees: 400
}

const recentAttendance = [
  { id: 1, event: "Math Workshop", date: "2025-01-10", status: "PRESENT" },
  { id: 2, event: "Science Fair", date: "2025-01-08", status: "PRESENT" },
  { id: 3, event: "Sports Day", date: "2025-01-05", status: "ABSENT" },
  { id: 4, event: "Art Exhibition", date: "2025-01-03", status: "PRESENT" },
]

const feeStatus = [
  { id: 1, name: "Registration Fee", amount: 500, status: "PAID", dueDate: "2025-01-01" },
  { id: 2, name: "Laboratory Fee", amount: 300, status: "PAID", dueDate: "2025-01-15" },
  { id: 3, name: "Activity Fee", amount: 200, status: "UNPAID", dueDate: "2025-02-01" },
  { id: 4, name: "Library Fee", amount: 200, status: "UNPAID", dueDate: "2025-02-15" },
]

export function StudentDashboard({ studentId }: StudentDashboardProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Dashboard</h2>
        <p className="text-muted-foreground">
          Track your attendance, fees, and academic progress.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Rate
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentData.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {studentData.attendedEvents} of {studentData.totalEvents} events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fee Status
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{studentData.paidFees}</div>
            <p className="text-xs text-muted-foreground">
              ₱{studentData.pendingFees} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payment Progress
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((studentData.paidFees / studentData.totalFees) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              ₱{studentData.totalFees} total fees
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{record.event}</p>
                    <p className="text-sm text-muted-foreground">{record.date}</p>
                  </div>
                  <Badge 
                    variant={record.status === "PRESENT" ? "default" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    {record.status === "PRESENT" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fee Status */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feeStatus.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{fee.name}</p>
                    <p className="text-sm text-muted-foreground">Due: {fee.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₱{fee.amount}</p>
                    <Badge 
                      variant={fee.status === "PAID" ? "default" : "destructive"}
                    >
                      {fee.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 