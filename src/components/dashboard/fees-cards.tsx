"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Edit, 
  Trash2, 
  Settings,
  GraduationCap,
  Building,
  Globe,
  Calendar,
  CreditCard,
  MoreHorizontal
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { useSession } from "next-auth/react"

interface Fee {
  id: string
  name: string
  type: string
  amount: number
  description: string
  dueDate: string
  semester: string
  schoolYear: string
  scope_type: string
  scope_college: string
  scope_course: string
  createdAt: string
  status?: string
}

export function FeesCards() {
  const { data: session } = useSession()
  const router = useRouter()
  const [fees, setFees] = useState<Fee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredFees, setFilteredFees] = useState<Fee[]>([])
  const [reportOpen, setReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportData, setReportData] = useState<{ feeId: string; paidStudentCount: number; totalPaid: number } | null>(null)
  const [selectedFee, setSelectedFee] = useState<{ id: string; name: string } | null>(null)

  const fetchFees = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/fees")
      if (response.ok) {
        const data = await response.json()
        setFees(data.fees || [])
        setFilteredFees(data.fees || [])
      }
    } catch (error) {
      console.error("Error fetching fees:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFees()
  }, [])

  useEffect(() => {
    const filtered = fees.filter((fee) => {
      const searchLower = searchTerm.toLowerCase()
      
      return fee.name.toLowerCase().includes(searchLower) ||
        fee.type.toLowerCase().includes(searchLower) ||
        fee.description.toLowerCase().includes(searchLower) ||
        fee.semester.toLowerCase().includes(searchLower) ||
        fee.schoolYear.toLowerCase().includes(searchLower) ||
        fee.scope_type.toLowerCase().includes(searchLower) ||
        fee.scope_college?.toLowerCase().includes(searchLower) ||
        fee.scope_course?.toLowerCase().includes(searchLower)
    })
    setFilteredFees(filtered)
  }, [searchTerm, fees])

  const handleDeleteFee = async (feeId: string) => {
    if (!confirm("Are you sure you want to delete this fee? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/fees/${feeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchFees() // Refresh the list
      } else {
        alert("Error deleting fee")
      }
    } catch (error) {
      console.error("Error deleting fee:", error)
      alert("Error deleting fee")
    }
  }

  const openReport = async (feeId: string, feeName?: string) => {
    try {
      setReportLoading(true)
      setReportOpen(true)
      setReportData(null)
      setSelectedFee({ id: feeId, name: feeName || '' })
      const res = await fetch(`/api/fees/${feeId}/report`)
      if (res.ok) {
        const data = await res.json()
        setReportData(data)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to load report')
        setReportOpen(false)
      }
    } catch (e) {
      console.error('Error loading report', e)
      alert('Error loading report')
      setReportOpen(false)
    } finally {
      setReportLoading(false)
    }
  }

  const approveFee = async (id: string) => {
    if (!confirm('Approve this fee?')) return
    try {
      const res = await fetch(`/api/fees/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'APPROVE' }) })
      if (res.ok) {
        await fetchFees()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to approve fee')
      }
    } catch (e) {
      console.error('Approve fee failed', e)
      alert('Approve fee failed')
    }
  }

  const rejectFee = async (id: string) => {
    const reason = window.prompt('Enter rejection reason (optional):') || null
    try {
      const res = await fetch(`/api/fees/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REJECT', reason }) })
      if (res.ok) {
        await fetchFees()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to reject fee')
      }
    } catch (e) {
      console.error('Reject fee failed', e)
      alert('Reject fee failed')
    }
  }

  const getScopeBadge = (scope_type: string, scope_college?: string, scope_course?: string) => {
    switch (scope_type) {
      case "UNIVERSITY_WIDE":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Globe className="h-3 w-3 mr-1" />
            University-wide
          </Badge>
        )
      case "COLLEGE_WIDE":
        return (
          <Badge className="bg-green-100 text-green-800">
            <Building className="h-3 w-3 mr-1" />
            {scope_college ? scope_college.split(' ').slice(-1)[0] : 'College-wide'}
          </Badge>
        )
      case "COURSE_SPECIFIC":
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <GraduationCap className="h-3 w-3 mr-1" />
            Course-specific
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            {scope_type}
          </Badge>
        )
    }
  }

  const getFeeTypeBadge = (type: string) => {
    const typeColors = {
      "organization fee": "bg-purple-100 text-purple-800",
      "activity fee": "bg-orange-100 text-orange-800",
      "registration fee": "bg-blue-100 text-blue-800",
      "laboratory fee": "bg-indigo-100 text-indigo-800",
      "library fee": "bg-pink-100 text-pink-800",
      "other": "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || typeColors.other}>
        {type.replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "No due date"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search fees..."
              className="pl-10 w-64"
              disabled
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search fees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredFees.length} of {fees.length} fees
        </div>
      </div>

      {filteredFees.length === 0 && !loading ? (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No fees match your search" : "No fees found"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "Try adjusting your search terms." : "Get started by creating your first fee structure."}
          </p>
          {!searchTerm && (
            <Link href="/dashboard/fees/new">
              <Button>Create Your First Fee</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFees.map((fee) => (
            <Card key={fee.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg leading-tight flex items-center gap-2">
                      {fee.name}
                      {fee.status && (
                        <Badge className={`${fee.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {fee.status === 'PENDING' ? 'Pending' : 'Approved'}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {getFeeTypeBadge(fee.type)}
                      {getScopeBadge(fee.scope_type, fee.scope_college, fee.scope_course)}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/fees/${fee.id}`} className="flex items-center">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openReport(fee.id, fee.name)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                      {/* Admin approval actions for pending fees */}
                      {session?.user?.role === 'ADMIN' && fee.status === 'PENDING' && (
                        <>
                          <DropdownMenuItem onClick={() => approveFee(fee.id)} className="bg-green-50 text-green-700 font-medium focus:bg-green-100 focus:text-green-800">
                            <span>Approve</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => rejectFee(fee.id)} className="bg-red-50 text-red-700 font-medium focus:bg-red-100 focus:text-red-800">
                            <span>Reject</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDeleteFee(fee.id)}
                        className="text-red-600 focus:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {fee.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{fee.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-lg text-green-600">
                      {formatCurrency(fee.amount)}
                    </span>
                  </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{formatDate(fee.dueDate)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">School Year:</span>
                      <Badge variant="outline" className="text-xs">
                        {fee.schoolYear}
                      </Badge>
                    </div>

                    {fee.scope_type === "COLLEGE_WIDE" && fee.scope_college && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">College:</span>
                        <span className="text-xs text-gray-800">{fee.scope_college}</span>
                      </div>
                    )}

                    {fee.scope_type === "COURSE_SPECIFIC" && fee.scope_course && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="text-xs text-gray-800">{fee.scope_course}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fee Report{selectedFee?.name ? ` - ${selectedFee.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {reportLoading && <p className="text-sm text-gray-600">Loading...</p>}
            {!reportLoading && reportData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Students Paid</span>
                  <span className="font-semibold">{reportData.paidStudentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Total Collected</span>
                  <span className="font-semibold">{`₱${reportData.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</span>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={async () => {
                      if (!selectedFee?.id) return
                      try {
                        const res = await fetch(`/api/fees/${selectedFee.id}/report/pdf`)
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}))
                          alert(data.error || 'Failed to generate PDF')
                          return
                        }
                        const blob = await res.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `fee-report-${(selectedFee.name || 'report').replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        window.URL.revokeObjectURL(url)
                      } catch (e) {
                        console.error('PDF download failed', e)
                        alert('PDF download failed')
                      }
                    }}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 