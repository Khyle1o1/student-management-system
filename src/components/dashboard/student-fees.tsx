"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Search, 
  DollarSign, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  FileText,
  Upload,
  Clock,
  Eye
} from "lucide-react"
// Receipt upload removed: admin marks payments as paid directly

interface FeeStructure {
  id: string
  name: string
  type: string
  amount: number
  description?: string
  dueDate?: string
  semester?: string
  schoolYear: string
}

interface Payment {
  id: string
  amount: number
  paymentMethod?: string
  reference?: string
  notes?: string
  paidAt: string
  approvalStatus?: string
  receiptUrl?: string
  rejectionReason?: string
  uploadedAt?: string
  fee: {
    id: string
    name: string
    type: string
  }
  status: string
}

interface FeeData {
  fees: FeeStructure[]
  payments: Payment[]
  summary: {
    totalFees: number
    totalPaid: number
    totalPending: number
    paymentProgress: number
  }
}

interface StudentFeesProps {
  studentId: string | null
}

export function StudentFees({ studentId }: StudentFeesProps) {
  const [feeData, setFeeData] = useState<FeeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"fees" | "payments">("fees")

  const fetchFeeData = useCallback(async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/students/fees/${studentId}`)
      if (response.ok) {
        const data = await response.json()
        setFeeData(data)
      }
    } catch (error) {
      console.error("Error fetching fee data:", error)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (studentId) {
      fetchFeeData()
    }
  }, [studentId, fetchFeeData])

  const getStatusBadge = (feeId: string, feeAmount: number) => {
    if (!feeData) return null
    
    const payments = feeData.payments.filter(payment => payment.fee.id === feeId)
    const paidAmount = payments
      .filter(payment => payment.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0)
    const hasPartialPayment = payments.some(payment => payment.status === 'PARTIAL')
    
    if (paidAmount >= feeAmount) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          PAID
        </Badge>
      )
    } else if (paidAmount > 0 || hasPartialPayment) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          PARTIAL
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          UNPAID
        </Badge>
      )
    }
  }


  const getFeeTypeBadge = (type: string) => {
    const typeColors = {
      ORGANIZATION_FEE: "bg-purple-100 text-purple-800",
      ACTIVITY_FEE: "bg-orange-100 text-orange-800",
      REGISTRATION_FEE: "bg-blue-100 text-blue-800",
      LABORATORY_FEE: "bg-indigo-100 text-indigo-800",
      LIBRARY_FEE: "bg-pink-100 text-pink-800",
      OTHER: "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || typeColors.OTHER}>
        {type.replace('_', ' ')}
      </Badge>
    )
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

  const getPaidAmount = (feeId: string) => {
    if (!feeData) return 0
    return feeData.payments
      .filter(payment => payment.fee.id === feeId && payment.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0)
  }

  const filteredFees = feeData?.fees.filter((fee) => {
    const searchLower = searchTerm.toLowerCase()
    return fee.name.toLowerCase().includes(searchLower) ||
      fee.type.toLowerCase().includes(searchLower) ||
      fee.schoolYear.toLowerCase().includes(searchLower)
  }) || []

  const filteredPayments = feeData?.payments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase()
    return payment.fee.name.toLowerCase().includes(searchLower) ||
      payment.fee.type.toLowerCase().includes(searchLower) ||
      payment.reference?.toLowerCase().includes(searchLower)
  }) || []

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading fee information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!feeData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <DollarSign className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load fee information</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Fee Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Fees</p>
                <p className="text-2xl font-bold">{formatCurrency(feeData.summary.totalFees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(feeData.summary.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(feeData.summary.totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-purple-600">{feeData.summary.paymentProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("fees")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "fees"
                    ? "bg-blue-100 text-blue-800"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Fee Obligations
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "payments"
                    ? "bg-blue-100 text-blue-800"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <CreditCard className="h-4 w-4 inline mr-2" />
                Payment History
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" onClick={fetchFeeData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "fees" ? (
            /* Fee Obligations Table */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No fees found</h3>
                        <p className="text-gray-600">
                          {searchTerm ? "Try adjusting your search terms." : "You don't have any fee obligations yet."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFees.map((fee) => {
                      const paidAmount = getPaidAmount(fee.id)
                      const balance = fee.amount - paidAmount
                      const pending = false
                      const rejectionReason = null
                      
                      return (
                        <TableRow key={fee.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              {fee.description && (
                                <p className="text-sm text-gray-600 truncate max-w-xs">
                                  {fee.description}
                                </p>
                              )}
                              {rejectionReason && (
                                <Alert className="mt-2 bg-orange-50 border-orange-200">
                                  <AlertDescription className="text-sm text-orange-800">
                                    <strong>Rejected:</strong> {rejectionReason}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getFeeTypeBadge(fee.type)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(fee.amount)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(paidAmount)}
                          </TableCell>
                          <TableCell className={balance > 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrency(balance)}
                          </TableCell>
                          <TableCell>
                            {fee.dueDate ? (
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>{formatDate(fee.dueDate)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">No due date</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(fee.id, fee.amount)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">Admin will mark as paid</span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Payment History Table */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                        <p className="text-gray-600">
                          {searchTerm ? "Try adjusting your search terms." : "You haven't made any payments yet."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => {
                      const getApprovalStatusBadge = () => {
                        if (payment.approvalStatus === 'APPROVED') {
                          return (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )
                        } else if (payment.approvalStatus === 'REJECTED') {
                          return (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )
                        } else {
                          return (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )
                        }
                      }

                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(payment.paidAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.fee.name}</p>
                              {getFeeTypeBadge(payment.fee.type)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {getApprovalStatusBadge()}
                            {payment.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">
                                {payment.rejectionReason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-400">No receipt</span>
                          </TableCell>
                          <TableCell>
                            {payment.notes || (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt upload removed */}
    </div>
  )
} 