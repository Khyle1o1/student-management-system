"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  CreditCard,
  RefreshCw,
  Loader2
} from "lucide-react"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

interface StudentDetailsModalProps {
  studentId: string | null
  open: boolean
  onClose: () => void
}

interface StudentDetails {
  id: string
  student_id: string
  name: string
  email: string
  phone?: string
  college: string
  course: string
  year_level: number
  created_at: string
  archived?: boolean
  archived_at?: string
  attendance: {
    attended: number
    missed: number
    total: number
    records: Array<{
      id: string
      status: string
      created_at: string
      event: {
        id: string
        title: string
        date: string
        location: string
      }
    }>
  }
  payments: {
    paid: number
    unpaid: number
    total: number
    records: Array<{
      id: string
      amount: number
      status: string
      payment_date: string
      reference?: string
      fee: {
        id: string
        name: string
        amount: number
        due_date: string
        description: string
      }
    }>
  }
}

export function StudentDetailsModal({ studentId, open, onClose }: StudentDetailsModalProps) {
  const [student, setStudent] = useState<StudentDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null)
  const [receiptModal, setReceiptModal] = useState<{ open: boolean; paymentId: string | null; receipt: string }>({ open: false, paymentId: null, receipt: "" })

  const fetchStudentDetails = useCallback(async () => {
    if (!studentId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/students/${studentId}`)
      if (response.ok) {
        const data = await response.json()
        setStudent(data)
      }
    } catch (error) {
      console.error("Error fetching student details:", error)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (studentId && open) {
      fetchStudentDetails()
    }
  }, [studentId, open, fetchStudentDetails])

  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: string, receiptNumber?: string) => {
    setUpdatingPayment(paymentId)
    try {
      const response = await fetch(`/api/payments/${paymentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, receiptNumber })
      })

      if (response.ok) {
        // Refresh student details
        await fetchStudentDetails()
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
    } finally {
      setUpdatingPayment(null)
    }
  }

  const openReceiptPrompt = (paymentId: string) => {
    setReceiptModal({ open: true, paymentId, receipt: "" })
  }

  const submitReceipt = async () => {
    if (!receiptModal.paymentId || !receiptModal.receipt.trim()) return
    await handleUpdatePaymentStatus(receiptModal.paymentId, 'PAID', receiptModal.receipt.trim())
    setReceiptModal({ open: false, paymentId: null, receipt: "" })
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const getYearLevelText = (level: number) => {
    const yearMap: { [key: number]: string } = {
      1: '1st Year',
      2: '2nd Year',
      3: '3rd Year',
      4: '4th Year'
    }
    return yearMap[level] || `Year ${level}`
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
          <DialogDescription>
            View student information, attendance, and payment records
          </DialogDescription>
        </DialogHeader>

        {loading && !student ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading student details...</span>
          </div>
        ) : student ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-medium">{student.student_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {student.email}
                  </p>
                </div>
                {student.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {student.phone}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">College</p>
                  <p className="font-medium">{student.college}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-medium flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {student.course}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year Level</p>
                  <p className="font-medium">{getYearLevelText(student.year_level)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enrolled Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(student.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Attendance & Payment Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Events:</span>
                    <span className="font-bold">{student.attendance.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Attended:</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {student.attendance.attended}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Missed:</span>
                    <Badge variant="default" className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      {student.attendance.missed}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Fees:</span>
                    <span className="font-bold">{student.payments.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Paid:</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {student.payments.paid}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Unpaid:</span>
                    <Badge variant="default" className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      {student.payments.unpaid}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Records */}
            <Tabs defaultValue="attendance" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
                <TabsTrigger value="payments">Payment Records</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    {student.attendance.records.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No attendance records found
                      </p>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Event</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {student.attendance.records.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                  {record.event?.title || 'Unknown Event'}
                                </TableCell>
                                <TableCell>{formatDate(record.event?.date)}</TableCell>
                                <TableCell>{record.event?.location || 'N/A'}</TableCell>
                                <TableCell>
                                  {record.status === 'PRESENT' ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Attended
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-800">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Missed
                                    </Badge>
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
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    {student.payments.records.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No payment records found
                      </p>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fee Name</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {student.payments.records.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                  {record.fee?.name || 'Unknown Fee'}
                                </TableCell>
                                <TableCell>
                                <span className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {record.fee?.amount?.toFixed(2)}
                                </span>
                                </TableCell>
                                <TableCell>{formatDate(record.fee?.due_date)}</TableCell>
                                <TableCell>
                                  {record.status === 'PAID' ? (
                                    <div className="space-y-1">
                                      <Badge className="bg-green-100 text-green-800">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Paid
                                      </Badge>
                                      {record.reference && (
                                        <div className="text-xs text-gray-600">Receipt No: <span className="font-medium">{record.reference}</span></div>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-800">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Unpaid
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {record.status !== 'PAID' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={updatingPayment === record.id}
                                      onClick={() => openReceiptPrompt(record.id)}
                                    >
                                      {updatingPayment === record.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>Mark as Paid</>
                                      )}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-500">Locked (contact super admin to modify)</span>
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
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No student data available
          </p>
        )}
      </DialogContent>
      {receiptModal.open && (
        <Dialog open={receiptModal.open} onOpenChange={() => setReceiptModal({ open: false, paymentId: null, receipt: "" })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Receipt Number</DialogTitle>
              <DialogDescription>Receipt number is required to mark as Paid.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Receipt Number"
                value={receiptModal.receipt}
                onChange={(e) => setReceiptModal({ ...receiptModal, receipt: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setReceiptModal({ open: false, paymentId: null, receipt: "" })}>Cancel</Button>
                <Button size="sm" onClick={submitReceipt} disabled={!receiptModal.receipt.trim()}>Confirm Paid</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}

