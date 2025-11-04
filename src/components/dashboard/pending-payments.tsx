"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Info
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Payment {
  id: string
  amount: number
  receipt_url: string
  approval_status: string
  rejection_reason?: string
  uploaded_at: string
  approved_at?: string
  rejected_at?: string
  student: {
    id: string
    student_id: string
    name: string
    email: string
    college: string
    course: string
    year_level: number
  }
  fee: {
    id: string
    name: string
    amount: number
    scope_type: string
    scope_college?: string
    scope_course?: string
  }
  approver?: {
    id: string
    name: string
    email: string
    role: string
  }
  rejector?: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface PendingPaymentsData {
  payments: Payment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function PendingPayments() {
  const [data, setData] = useState<PendingPaymentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL")
  const [page, setPage] = useState(1)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        limit: "20",
      })

      const response = await fetch(`/api/payments/pending?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleApprove = async (paymentId: string) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'APPROVE',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve payment')
      }

      await fetchPayments()
      setApprovalModalOpen(false)
      setSelectedPayment(null)
    } catch (err: any) {
      setError(err.message || 'Failed to approve payment')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPayment) return

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/payments/${selectedPayment.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason: rejectionReason || 'Payment receipt was not verified',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject payment')
      }

      await fetchPayments()
      setApprovalModalOpen(false)
      setSelectedPayment(null)
      setRejectionReason("")
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment')
    } finally {
      setProcessing(false)
    }
  }

  const openRejectionModal = (payment: Payment) => {
    setSelectedPayment(payment)
    setRejectionReason("")
    setApprovalModalOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    // Check if date is valid (not Jan 1, 1970 which is epoch 0)
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      return 'N/A'
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0 h-5">
            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
            Approved
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0 h-5">
            <XCircle className="h-2.5 w-2.5 mr-0.5" />
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0 h-5">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            Pending
          </Badge>
        )
    }
  }

  const filteredPayments = data?.payments.filter((payment) => {
    // Only show payments with receipts
    if (!payment.receipt_url) return false
    
    const searchLower = searchTerm.toLowerCase()
    return (
      payment.student.name.toLowerCase().includes(searchLower) ||
      payment.student.student_id.toLowerCase().includes(searchLower) ||
      payment.student.email.toLowerCase().includes(searchLower) ||
      payment.fee.name.toLowerCase().includes(searchLower)
    )
  }) || []

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading pending payments...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Review</CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ALL">All Payments</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" onClick={fetchPayments}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs font-semibold py-2 px-3 whitespace-nowrap">Student Name</TableHead>
                  <TableHead className="text-xs font-semibold py-2 px-3 whitespace-nowrap">Fee Type</TableHead>
                  <TableHead className="text-xs font-semibold py-2 px-3 whitespace-nowrap">Amount</TableHead>
                  <TableHead className="text-xs font-semibold py-2 px-3 whitespace-nowrap">Uploaded</TableHead>
                  <TableHead className="text-xs font-semibold py-2 px-3 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold py-2 px-3 whitespace-nowrap">Receipt</TableHead>
                  <TableHead className="text-xs font-semibold py-2 px-3 whitespace-nowrap">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                      <p className="text-gray-600">
                        {searchTerm || statusFilter !== 'ALL'
                          ? "Try adjusting your filters."
                          : "No payments pending approval."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50/50">
                      <TableCell className="py-2 px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center space-x-1 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                              <span>{payment.student.name}</span>
                              <Info className="h-3 w-3 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64">
                            <DropdownMenuLabel>Student Details</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 space-y-1.5 text-xs">
                              <div>
                                <span className="font-medium">ID:</span> {payment.student.student_id}
                              </div>
                              <div>
                                <span className="font-medium">Email:</span> {payment.student.email}
                              </div>
                              <div>
                                <span className="font-medium">College:</span> {payment.student.college}
                              </div>
                              <div>
                                <span className="font-medium">Course:</span> {payment.student.course}
                              </div>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <span className="text-xs font-medium">{payment.fee.name}</span>
                      </TableCell>
                      <TableCell className="py-2 px-3 font-medium text-sm">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="py-2 px-3 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(payment.uploaded_at)}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="flex flex-col space-y-1">
                          {getStatusBadge(payment.approval_status)}
                          {payment.rejection_reason && (
                            <span className="text-[10px] text-red-600 max-w-[120px] truncate" title={payment.rejection_reason}>
                              {payment.rejection_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.open(payment.receipt_url, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        {payment.approval_status === 'PENDING_APPROVAL' ? (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(payment.id)}
                              disabled={processing}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => openRejectionModal(payment)}
                              disabled={processing}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : payment.approval_status === 'APPROVED' && payment.approver ? (
                          <span className="text-[10px] text-gray-600">
                            by {payment.approver.name}
                          </span>
                        ) : payment.approval_status === 'REJECTED' && payment.rejector ? (
                          <span className="text-[10px] text-gray-600">
                            by {payment.rejector.name}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total} payments
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!data.pagination.hasPrev || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.pagination.hasNext || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment receipt.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Student: {selectedPayment.student.name}</p>
                <p className="text-sm text-gray-600">Fee: {selectedPayment.fee.name}</p>
                <p className="text-sm text-gray-600">Amount: {formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setApprovalModalOpen(false)
                    setSelectedPayment(null)
                    setRejectionReason("")
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

