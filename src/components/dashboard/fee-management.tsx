"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  Search, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Edit,
  Download,
  Plus,
  Save,
  Loader2
} from "lucide-react"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

interface Student {
  id: string
  studentId: string
  name: string
  email: string
  college: string
  course: string
  yearLevel: number
  feeAmount: number
  totalPaid: number
  balance: number
  paymentStatus: string
  payments: Payment[]
}

interface Payment {
  id: string
  amount: number
  status: string
  paymentDate: string
  paymentMethod?: string
  reference?: string
  notes?: string
}

interface FeeData {
  fee: {
    id: string
    name: string
    amount: number
    scope_type: string
    scope_college?: string
    scope_course?: string
    due_date?: string
  }
  students: Student[]
  summary: {
    totalStudents: number
    paidStudents: number
    partialStudents: number
    unpaidStudents: number
    totalExpectedRevenue: number
    totalCollectedRevenue: number
    collectionRate: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface FeeManagementProps {
  feeId: string
}

export function FeeManagement({ feeId }: FeeManagementProps) {
  const router = useRouter()
  const [feeData, setFeeData] = useState<FeeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "",
    reference: "",
    notes: "",
    status: "PAID"
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search changes
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchFeeData = useCallback(async (page = 1, search = "") => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search })
      })
      
      const response = await fetch(`/api/fees/${feeId}/students?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFeeData(data)
        setCurrentPage(page)
      } else {
        console.error("Failed to fetch fee data")
      }
    } catch (error) {
      console.error("Error fetching fee data:", error)
    } finally {
      setLoading(false)
    }
  }, [feeId])

  // Fetch data when debounced search term changes
  useEffect(() => {
    fetchFeeData(1, debouncedSearchTerm)
  }, [feeId, debouncedSearchTerm, fetchFeeData])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (feeData?.pagination.totalPages || 1)) {
      fetchFeeData(newPage, debouncedSearchTerm)
    }
  }

  const filteredStudents = feeData?.students.filter((student) => {
    const matchesStatus = 
      statusFilter === "ALL" || student.paymentStatus === statusFilter
    
    return matchesStatus
  }) || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case "PARTIAL":
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>
      case "UNPAID":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Unpaid</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getScopeDescription = () => {
    if (!feeData?.fee) return ""
    
    switch (feeData.fee.scope_type) {
      case "UNIVERSITY_WIDE":
        return "All students across all colleges"
      case "COLLEGE_WIDE":
        return `Students from ${feeData.fee.scope_college}`
      case "COURSE_SPECIFIC":
        return `Students from ${feeData.fee.scope_course}`
      default:
        return ""
    }
  }

  const generateReferenceNumber = (studentId: string, feeId: string) => {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
    const timeStr = date.getTime().toString().slice(-4) // Last 4 digits of timestamp
    const studentShort = studentId.slice(-4) // Last 4 characters of student ID
    const feeShort = feeId.slice(0, 8) // First 8 characters of fee ID
    
    return `PAY-${dateStr}-${studentShort}-${timeStr}`
  }

  const openPaymentDialog = (student: Student) => {
    const autoReference = generateReferenceNumber(student.studentId, feeId)
    
    setSelectedStudent(student)
    setPaymentForm({
      amount: (student.balance > 0 ? student.balance : student.feeAmount).toString(),
      paymentMethod: "",
      reference: autoReference,
      notes: "",
      status: "PAID"
    })
    setPaymentDialog(true)
  }

  const handleAddPayment = async () => {
    if (!selectedStudent) return

    // Validate form data before submitting
    const amount = parseFloat(paymentForm.amount)
    if (isNaN(amount) || amount <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid amount",
        text: "Please enter a valid amount greater than 0.",
        confirmButtonColor: "#0f172a",
      })
      return
    }

    if (!paymentForm.status) {
      await Swal.fire({
        icon: "warning",
        title: "Status required",
        text: "Please select a payment status before saving.",
        confirmButtonColor: "#0f172a",
      })
      return
    }

    setSubmittingPayment(true)
    try {
      // Build payload, only include optional fields if they have values
      const payload: any = {
        studentId: selectedStudent.id,
        feeId: feeId,
        amount: amount,
        status: paymentForm.status,
      }

      // Only add optional fields if they have actual values
      if (paymentForm.paymentMethod && paymentForm.paymentMethod.trim()) {
        payload.paymentMethod = paymentForm.paymentMethod.trim()
      }
      if (paymentForm.reference && paymentForm.reference.trim()) {
        payload.reference = paymentForm.reference.trim()
      }
      if (paymentForm.notes && paymentForm.notes.trim()) {
        payload.notes = paymentForm.notes.trim()
      }

      console.log("Payment payload:", payload)

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await Swal.fire({
          icon: "success",
          title: "Payment recorded",
          text: "The payment has been added successfully.",
          confirmButtonColor: "#0f172a",
        })
        setPaymentDialog(false)
        setSelectedStudent(null)
        setPaymentForm({
          amount: "",
          paymentMethod: "",
          reference: "",
          notes: "",
          status: "PAID"
        })
        fetchFeeData(currentPage, debouncedSearchTerm) // Refresh current page with current search
      } else {
        const errorData = await response.json()
        console.error("Failed to add payment:", errorData)
        
        // Handle validation errors more gracefully
        if (errorData.error && Array.isArray(errorData.error)) {
          const validationErrors = errorData.error.map((err: any) => `${err.path?.join('.')}: ${err.message}`).join('\n')
          await Swal.fire({
            icon: "error",
            title: "Validation errors",
            html: validationErrors.replace(/\n/g, "<br/>"),
            confirmButtonColor: "#dc2626",
          })
        } else {
          await Swal.fire({
            icon: "error",
            title: "Unable to add payment",
            text: errorData.error || "Unknown error while adding the payment.",
            confirmButtonColor: "#dc2626",
          })
        }
      }
    } catch (error) {
      console.error("Error adding payment:", error)
      await Swal.fire({
        icon: "error",
        title: "Unexpected error",
        text: "An error occurred while adding the payment. Please try again.",
        confirmButtonColor: "#dc2626",
      })
    } finally {
      setSubmittingPayment(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading fee data...</span>
      </div>
    )
  }

  if (!feeData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Failed to load fee data</p>
        <Button variant="outline" onClick={() => fetchFeeData(1, "")} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="text-sm text-gray-500">/</div>
            <h1 className="text-3xl font-bold tracking-tight">{feeData.fee.name}</h1>
          </div>
          <p className="text-muted-foreground">
            Manage student payments and track collection status
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Fee Info and Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{feeData.summary.totalStudents}</p>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{getScopeDescription()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{feeData.summary.paidStudents}</p>
                <p className="text-sm text-gray-600">Paid Students</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {feeData.summary.collectionRate}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(feeData.summary.totalCollectedRevenue)}</p>
                <p className="text-sm text-gray-600">Collected</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              of {formatCurrency(feeData.summary.totalExpectedRevenue)} expected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{feeData.summary.unpaidStudents}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {feeData.summary.partialStudents} partial payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>Student Payments</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>College/Course</TableHead>
                  <TableHead>Fee Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.studentId}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{student.college}</p>
                        <p className="text-xs text-gray-600">{student.course}</p>
                        <p className="text-xs text-gray-500">Year {student.yearLevel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(student.feeAmount)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(student.totalPaid)}
                    </TableCell>
                    <TableCell className={student.balance > 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(student.balance)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(student.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {student.paymentStatus === "PAID" ? (
                          <div className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Fully Paid
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentDialog(student)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Payment
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No students found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {feeData.pagination && (
        <div className="flex items-center justify-between px-2 py-4 sm:px-4">
          <div className="flex-1 text-sm text-gray-700">
            Showing {feeData.pagination.page * feeData.pagination.limit - feeData.pagination.limit + 1} to{" "}
            {Math.min(feeData.pagination.page * feeData.pagination.limit, feeData.pagination.total)} of{" "}
            {feeData.pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!feeData.pagination.hasPrev}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!feeData.pagination.hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Method
              </Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="GCASH">GCash</SelectItem>
                  <SelectItem value="PAYMAYA">PayMaya</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reference" className="text-right">
                Reference
              </Label>
              <Input
                id="reference"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Receipt #, Transaction ID, etc."
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes..."
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment} disabled={submittingPayment}>
              {submittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 