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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  RefreshCw,
  DollarSign,
  Check,
  X,
  Edit,
  Users,
  CreditCard
} from "lucide-react"

interface Student {
  id: string
  studentId: string
  name: string
  email: string
  yearLevel: string
  section: string
  course: string
}

interface Fee {
  id: string
  name: string
  type: string
  amount: number
  schoolYear: string
  semester: string
}

interface Payment {
  feeId: string
  feeName: string
  feeAmount: number
  paymentId: string | null
  status: string
  amount: number
  paymentDate: string | null
  paymentMethod: string | null
  reference: string | null
  notes: string | null
}

interface StudentPayment {
  student: Student
  payments: Payment[]
  totalFees: number
  totalPaid: number
}

interface PaymentData {
  students: StudentPayment[]
  fees: Fee[]
}

export function PaymentManagement() {
  const [data, setData] = useState<PaymentData>({ students: [], fees: [] })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredStudents, setFilteredStudents] = useState<StudentPayment[]>([])
  const [selectedPayment, setSelectedPayment] = useState<{
    studentId: string
    studentName: string
    feeId: string
    feeName: string
    feeAmount: number
    currentStatus: string
    currentAmount: number
    paymentMethod: string | null
    reference: string | null
    notes: string | null
  } | null>(null)
  const [editingPayment, setEditingPayment] = useState({
    status: "",
    amount: "",
    paymentMethod: "",
    reference: "",
    notes: "",
  })

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/payments")
      if (response.ok) {
        const paymentData = await response.json()
        setData(paymentData)
        setFilteredStudents(paymentData.students)
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  useEffect(() => {
    const filtered = data.students.filter((studentPayment) => {
      const searchLower = searchTerm.toLowerCase()
      const student = studentPayment.student
      
      return student.name.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower) ||
        student.course.toLowerCase().includes(searchLower) ||
        student.section.toLowerCase().includes(searchLower)
    })
    setFilteredStudents(filtered)
  }, [searchTerm, data.students])

  const handleUpdatePayment = async () => {
    if (!selectedPayment) return

    try {
      const payload = {
        studentId: selectedPayment.studentId,
        feeId: selectedPayment.feeId,
        status: editingPayment.status,
        amount: parseFloat(editingPayment.amount) || selectedPayment.feeAmount,
        paymentMethod: editingPayment.paymentMethod || null,
        reference: editingPayment.reference || null,
        notes: editingPayment.notes || null,
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchPayments() // Refresh the data
        setSelectedPayment(null)
        setEditingPayment({
          status: "",
          amount: "",
          paymentMethod: "",
          reference: "",
          notes: "",
        })
      } else {
        alert("Error updating payment status")
      }
    } catch (error) {
      console.error("Error updating payment:", error)
      alert("Error updating payment status")
    }
  }

  const quickTogglePayment = async (studentId: string, feeId: string, currentStatus: string, feeAmount: number) => {
    const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID'
    
    try {
      const payload = {
        studentId,
        feeId,
        status: newStatus,
        amount: feeAmount,
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchPayments() // Refresh the data
      } else {
        alert("Error updating payment status")
      }
    } catch (error) {
      console.error("Error updating payment:", error)
      alert("Error updating payment status")
    }
  }

  const openPaymentDialog = (student: Student, payment: Payment) => {
    setSelectedPayment({
      studentId: student.id,
      studentName: student.name,
      feeId: payment.feeId,
      feeName: payment.feeName,
      feeAmount: payment.feeAmount,
      currentStatus: payment.status,
      currentAmount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
    })
    setEditingPayment({
      status: payment.status,
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod || "",
      reference: payment.reference || "",
      notes: payment.notes || "",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case 'PARTIAL':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      default:
        return <Badge variant="secondary">Unpaid</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading payment data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Tracking</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={fetchPayments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Student</TableHead>
                  {data.fees.map((fee) => (
                    <TableHead key={fee.id} className="text-center min-w-[120px]">
                      <div className="font-medium">{fee.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(fee.amount)}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[120px]">
                    <div className="font-medium">Total Progress</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={data.fees.length + 2} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-3">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          {searchTerm ? "No students found matching your search." : "No students found."}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((studentPayment) => (
                    <TableRow key={studentPayment.student.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{studentPayment.student.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {studentPayment.student.studentId} • {studentPayment.student.course}
                          </span>
                        </div>
                      </TableCell>
                      {studentPayment.payments.map((payment) => (
                        <TableCell key={payment.feeId} className="text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <button
                              onClick={() => quickTogglePayment(
                                studentPayment.student.id,
                                payment.feeId,
                                payment.status,
                                payment.feeAmount
                              )}
                              className="transition-colors"
                            >
                              {payment.status === 'PAID' ? (
                                <Check className="h-6 w-6 text-green-600 hover:text-green-700" />
                              ) : (
                                <X className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                            {getStatusBadge(payment.status)}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPaymentDialog(studentPayment.student, payment)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Payment</DialogTitle>
                                  <DialogDescription>
                                    Update payment details for {selectedPayment?.studentName} - {selectedPayment?.feeName}
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedPayment && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="status">Payment Status</Label>
                                        <Select
                                          value={editingPayment.status}
                                          onValueChange={(value) => setEditingPayment({...editingPayment, status: value})}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="PAID">Paid</SelectItem>
                                            <SelectItem value="UNPAID">Unpaid</SelectItem>
                                            <SelectItem value="PARTIAL">Partial</SelectItem>
                                            <SelectItem value="OVERDUE">Overdue</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="amount">Amount</Label>
                                        <Input
                                          id="amount"
                                          type="number"
                                          step="0.01"
                                          value={editingPayment.amount}
                                          onChange={(e) => setEditingPayment({...editingPayment, amount: e.target.value})}
                                          placeholder={selectedPayment.feeAmount.toString()}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="paymentMethod">Payment Method</Label>
                                        <Input
                                          id="paymentMethod"
                                          value={editingPayment.paymentMethod}
                                          onChange={(e) => setEditingPayment({...editingPayment, paymentMethod: e.target.value})}
                                          placeholder="e.g., Cash, Bank Transfer"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="reference">Reference #</Label>
                                        <Input
                                          id="reference"
                                          value={editingPayment.reference}
                                          onChange={(e) => setEditingPayment({...editingPayment, reference: e.target.value})}
                                          placeholder="Receipt/Transaction number"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="notes">Notes</Label>
                                      <Textarea
                                        id="notes"
                                        value={editingPayment.notes}
                                        onChange={(e) => setEditingPayment({...editingPayment, notes: e.target.value})}
                                        placeholder="Optional notes about this payment"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                                        Cancel
                                      </Button>
                                      <Button onClick={handleUpdatePayment}>
                                        Update Payment
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <div className="text-sm font-medium">
                            {formatCurrency(studentPayment.totalPaid)} / {formatCurrency(studentPayment.totalFees)}
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min((studentPayment.totalPaid / studentPayment.totalFees) * 100, 100)}%`
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((studentPayment.totalPaid / studentPayment.totalFees) * 100)}%
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 