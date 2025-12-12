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
  MoreHorizontal,
  X
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
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

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

type FeeReportSummary = {
  paidStudentCount: number
  totalPaid: number
  exemptedStudentCount: number
  totalEligibleStudents: number
}

type FeeReportCourseStat = {
  name: string
  college?: string
  paidCount: number
  unpaidCount: number
  exemptedCount: number
  totalCollected: number
}

type FeeReportCollegeStat = {
  name: string
  paidCount: number
  unpaidCount: number
  exemptedCount: number
  totalCollected: number
  courses: FeeReportCourseStat[]
}

type FeeReportData = {
  feeId: string
  scopeType: string
  scopeCollege?: string | null
  scopeCourse?: string | null
  summary: FeeReportSummary
  colleges: FeeReportCollegeStat[]
  courses: FeeReportCourseStat[]
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
  const [reportData, setReportData] = useState<FeeReportData | null>(null)
  const [selectedFee, setSelectedFee] = useState<{ id: string; name: string } | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewFee, setViewFee] = useState<any | null>(null)
  const [viewExemptedStudents, setViewExemptedStudents] = useState<{
    id: string
    studentId: string
    name: string
    email: string
  }[]>([])

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

  const handleReportOpenChange = (open: boolean) => {
    setReportOpen(open)
    if (!open) {
      // Ensure overlay/focus lock is fully released when closing
      setReportLoading(false)
      setReportData(null)
      setSelectedFee(null)
    }
  }

  // Defensive cleanup to make sure no stray overlays/focus locks remain
  useEffect(() => {
    if (!reportOpen) {
      const clean = () => {
        const overlays = document.querySelectorAll('[data-radix-dialog-overlay]')
        overlays.forEach((el) => el.parentElement?.removeChild(el))
        const contents = document.querySelectorAll('[data-radix-dialog-content]')
        contents.forEach((el) => {
          if (el.getAttribute('data-state') === 'closed') {
            el.parentElement?.removeChild(el)
          }
        })
        document.body.style.pointerEvents = ''
        document.body.style.overflow = ''
        document.documentElement.style.pointerEvents = ''
        document.documentElement.style.overflow = ''
      }
      // Run cleanup now and on next tick to catch animated nodes
      clean()
      setTimeout(clean, 50)
    }
  }, [reportOpen])

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
    try {
      const response = await fetch(`/api/fees/${feeId}`, {
        method: "DELETE",
        cache: "no-store",
      })

      if (response.ok) {
        setFees((prev) => prev.filter((fee) => fee.id !== feeId))
        return true
      }
      const data = await response.json().catch(() => ({}))
      await Swal.fire({
        icon: "error",
        title: "Unable to delete",
        text: data.error || "Something went wrong while deleting the fee.",
        confirmButtonColor: "#dc2626",
      })
    } catch (error) {
      console.error("Error deleting fee:", error)
      await Swal.fire({
        icon: "error",
        title: "Unable to delete",
        text: "Please try again in a moment.",
        confirmButtonColor: "#dc2626",
      })
    }
    return false
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
        await Swal.fire({
          icon: "error",
          title: "Report unavailable",
          text: data.error || "Failed to load report",
        })
        setReportOpen(false)
      }
    } catch (e) {
      console.error('Error loading report', e)
      await Swal.fire({
        icon: "error",
        title: "Report unavailable",
        text: "Error loading report",
      })
      setReportOpen(false)
    } finally {
      setReportLoading(false)
    }
  }

  const approveFee = async (id: string) => {
    try {
      const res = await fetch(`/api/fees/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'APPROVE' }) })
      if (res.ok) {
        setFees((prev) =>
          prev.map((fee) =>
            fee.id === id ? { ...fee, status: "APPROVED" } : fee
          )
        )
        return true
      }
      const data = await res.json().catch(() => ({}))
      await Swal.fire({
        icon: "error",
        title: "Approval failed",
        text: data.error || "We couldn't approve this fee. Please try again.",
      })
    } catch (e) {
      console.error('Approve fee failed', e)
      await Swal.fire({
        icon: "error",
        title: "Approval failed",
        text: "Something went wrong while approving the fee.",
      })
    }
    return false
  }

  const openView = async (feeId: string) => {
    try {
      setViewLoading(true)
      setViewOpen(true)
      setViewFee(null)
      setViewExemptedStudents([])

      const res = await fetch(`/api/fees/${feeId}`, { cache: "no-store" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        await Swal.fire({
          icon: "error",
          title: "Unable to load fee",
          text: data.error || "Failed to load fee details.",
        })
        setViewOpen(false)
        return
      }

      const fee = await res.json()
      setViewFee(fee)

      if (fee.exempted_students && Array.isArray(fee.exempted_students) && fee.exempted_students.length > 0) {
        try {
          const params = new URLSearchParams({
            ids: fee.exempted_students.join(","),
          })
          const sres = await fetch(`/api/students/by-ids?${params.toString()}`)
          if (sres.ok) {
            const sdata = await sres.json()
            const opts = (sdata.students || []).map((s: any) => ({
              id: s.id,
              studentId: s.student_id,
              name: s.name,
              email: s.email,
            }))
            setViewExemptedStudents(opts)
          }
        } catch (e) {
          console.error("Failed to load exempted students for view modal:", e)
        }
      }
    } catch (e) {
      console.error("Error loading fee details:", e)
      await Swal.fire({
        icon: "error",
        title: "Unable to load fee",
        text: "An error occurred while loading fee details.",
      })
      setViewOpen(false)
    } finally {
      setViewLoading(false)
    }
  }

  const rejectFee = async (id: string, reason: string | null) => {
    try {
      const res = await fetch(`/api/fees/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REJECT', reason }) })
      if (res.ok) {
        setFees((prev) =>
          prev.map((fee) =>
            fee.id === id ? { ...fee, status: "REJECTED" } : fee
          )
        )
        return true
      }
      const data = await res.json().catch(() => ({}))
      await Swal.fire({
        icon: "error",
        title: "Rejection failed",
        text: data.error || "We couldn't reject this fee.",
      })
    } catch (e) {
      console.error('Reject fee failed', e)
      await Swal.fire({
        icon: "error",
        title: "Rejection failed",
        text: "Something went wrong while rejecting the fee.",
      })
    }
    return false
  }

  const showProcessingAlert = (title: string) => {
    Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    })
  }

  const handleDeleteClick = async (fee: Fee) => {
    const result = await Swal.fire({
      title: "Delete this fee?",
      text: `"${fee.name}" and its assignments will be permanently removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Fee",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    showProcessingAlert("Deleting fee...")
    const success = await handleDeleteFee(fee.id)
    Swal.close()

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Fee deleted",
        text: `"${fee.name}" has been removed.`,
        confirmButtonColor: "#0f172a",
      })
    }
  }

  const handleApproveClick = async (fee: Fee) => {
    try {
      // Load full fee details including scope and exemptions before approving
      const res = await fetch(`/api/fees/${fee.id}`, { cache: "no-store" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        await Swal.fire({
          icon: "error",
          title: "Unable to load fee",
          text: data.error || "Failed to load fee details.",
        })
        return
      }

      const fullFee = await res.json()

      let exemptedSummary = "None"
      let exemptedDetailsHtml = ""

      if (fullFee.exempted_students && Array.isArray(fullFee.exempted_students) && fullFee.exempted_students.length > 0) {
        exemptedSummary = `${fullFee.exempted_students.length} student(s) exempted`

        try {
          const params = new URLSearchParams({
            ids: fullFee.exempted_students.join(","),
          })
          const sres = await fetch(`/api/students/by-ids?${params.toString()}`)
          if (sres.ok) {
            const sdata = await sres.json()
            const students: { name: string; student_id: string; email: string }[] =
              (sdata.students || []).map((s: any) => ({
                name: s.name,
                student_id: s.student_id,
                email: s.email,
              }))

            if (students.length > 0) {
              const items = students
                .map(
                  (s) =>
                    `<li><strong>${s.name}</strong> (${s.student_id}) <span style="color:#6b7280;">${s.email}</span></li>`
                )
                .join("")

              exemptedDetailsHtml = `
                <div style="margin-top:6px; max-height:120px; overflow:auto;">
                  <ul style="padding-left:18px; margin:0; font-size:13px;">
                    ${items}
                  </ul>
                </div>
              `
            }
          }
        } catch (e) {
          console.error("Failed to load exempted students for approval preview:", e)
        }
      }

      const html = `
        <div style="text-align:left; font-size:13px; color:#111827;">
          <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
            <div style="flex:1 1 200px;">
              <div style="font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:600;">Name</div>
              <div style="margin-top:2px;">${fullFee.name}</div>
            </div>
            <div style="flex:1 1 160px;">
              <div style="font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:600;">Type</div>
              <div style="margin-top:2px; text-transform:capitalize;">${fullFee.type}</div>
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
            <div style="flex:1 1 140px;">
              <div style="font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:600;">Amount</div>
              <div style="margin-top:2px; font-weight:600;">₱${Number(fullFee.amount || 0).toLocaleString()}</div>
            </div>
            <div style="flex:1 1 160px;">
              <div style="font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:600;">Due Date</div>
              <div style="margin-top:2px;">${fullFee.dueDate || 'N/A'}</div>
            </div>
          </div>

          <div style="border-top:1px solid #e5e7eb; padding-top:8px; margin-top:4px; margin-bottom:8px;">
            <div style="font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:600; margin-bottom:4px;">Scope</div>
            <div>${fullFee.scope_type || 'UNIVERSITY_WIDE'}</div>
            ${fullFee.scope_college ? `<div style="font-size:12px; color:#4b5563;">College: ${fullFee.scope_college}</div>` : ''}
            ${fullFee.scope_course ? `<div style="font-size:12px; color:#4b5563;">Course: ${fullFee.scope_course}</div>` : ''}
          </div>

          <div style="border-top:1px solid #e5e7eb; padding-top:8px; margin-top:4px;">
            <div style="font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:600; margin-bottom:4px;">
              Exempted Students
            </div>
            <div>${exemptedSummary}</div>
            ${exemptedDetailsHtml}
          </div>
        </div>
      `

      const result = await Swal.fire({
        title: "Approve this fee?",
        html,
        icon: "question",
        showCancelButton: true,
        focusConfirm: false,
        width: 620,
        confirmButtonText: "Approve Fee",
        confirmButtonColor: "#16a34a",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        customClass: {
          title: "text-lg font-semibold text-slate-900",
          popup: "rounded-2xl",
        },
      })

      if (!result.isConfirmed) return

      showProcessingAlert("Approving fee...")
      const success = await approveFee(fee.id)
      Swal.close()

      if (success) {
        await Swal.fire({
          icon: "success",
          title: "Fee approved",
          text: `"${fee.name}" is now active.`,
          confirmButtonColor: "#16a34a",
        })
      }
    } catch (e) {
      console.error("Error while approving fee with preview:", e)
      await Swal.fire({
        icon: "error",
        title: "Approval failed",
        text: "An error occurred while loading details or approving the fee.",
      })
    }
  }

  const handleRejectClick = async (fee: Fee) => {
    const result = await Swal.fire({
      title: "Reject this fee?",
      text: `Add an optional note for "${fee.name}" so the preparer knows what to fix.`,
      icon: "info",
      input: "textarea",
      inputPlaceholder: "Reason for rejection (optional)",
      inputAttributes: {
        maxlength: "500",
      },
      showCancelButton: true,
      confirmButtonText: "Reject Fee",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      preConfirm: (value) => value?.trim(),
    })

    if (!result.isConfirmed) return

    showProcessingAlert("Submitting decision...")
    const success = await rejectFee(fee.id, result.value || null)
    Swal.close()

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Fee rejected",
        text: result.value
          ? `Organizer note: ${result.value}`
          : `"${fee.name}" has been rejected.`,
        confirmButtonColor: "#0f172a",
      })
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

  const renderCourseStats = (courses: FeeReportCourseStat[]) => {
    if (!courses || courses.length === 0) {
      return <p className="text-xs text-gray-600">No course-level data available.</p>
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-12 text-[11px] font-semibold text-gray-700 px-1">
          <div className="col-span-5">Course</div>
          <div className="col-span-2 text-right">Paid</div>
          <div className="col-span-2 text-right">Not paid</div>
          <div className="col-span-1 text-right">Exempt</div>
          <div className="col-span-2 text-right">Collected</div>
        </div>
        <div className="space-y-1">
          {courses.map((course) => (
            <div
              key={`${course.college || "none"}-${course.name}`}
              className="grid grid-cols-12 items-center text-xs rounded border border-gray-100 bg-white px-2 py-2 shadow-sm"
            >
              <div className="col-span-5">
                <div className="font-medium text-gray-800">{course.name}</div>
                {course.college && <div className="text-[11px] text-gray-500">{course.college}</div>}
              </div>
              <div className="col-span-2 text-right text-green-700"> {course.paidCount}</div>
              <div className="col-span-2 text-right text-yellow-700">{course.unpaidCount}</div>
              <div className="col-span-1 text-right text-gray-700"> {course.exemptedCount}</div>
              <div className="col-span-2 text-right font-semibold text-gray-800">
                {formatCurrency(course.totalCollected || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
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
                      {session?.user?.role === 'ADMIN' && fee.status === 'PENDING' ? (
                        <>
                          <DropdownMenuItem onClick={() => handleApproveClick(fee)} className="bg-green-50 text-green-700 font-medium focus:bg-green-100 focus:text-green-800">
                            <span>Approve</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRejectClick(fee)} className="bg-red-50 text-red-700 font-medium focus:bg-red-100 focus:text-red-800">
                            <span>Reject</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => openView(fee.id)}>
                            <Settings className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
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
                          {session?.user?.role === 'ADMIN' && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(fee)}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
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
      {reportOpen && (
        <Dialog modal open={reportOpen} onOpenChange={handleReportOpenChange}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fee Report{selectedFee?.name ? ` - ${selectedFee.name}` : ''}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {reportLoading && <p className="text-sm text-gray-600">Loading...</p>}
              {!reportLoading && reportData && (
                <div className="space-y-4">
                  {(() => {
                    const summary = reportData.summary
                    const unpaidTotal = Math.max(
                      (summary?.totalEligibleStudents || 0) -
                        (summary?.paidStudentCount || 0) -
                        (summary?.exemptedStudentCount || 0),
                      0
                    )
                    const isUniversity = reportData.scopeType === "UNIVERSITY_WIDE"
                    const isCollegeWide = reportData.scopeType === "COLLEGE_WIDE"
                    const isCourseOnly = reportData.scopeType === "COURSE_SPECIFIC"

                    const targetColleges = isCollegeWide
                      ? reportData.colleges.filter((c) => !reportData.scopeCollege || c.name === reportData.scopeCollege)
                      : reportData.colleges

                    const courseOnlyStats = isCourseOnly
                      ? reportData.courses.filter((c) => !reportData.scopeCourse || c.name === reportData.scopeCourse)
                      : []

                    return (
                      <>
                        <div className="rounded-md border p-3">
                          <p className="text-sm font-semibold mb-2">General Summary</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">Students Paid</span>
                              <span className="font-semibold">{summary?.paidStudentCount ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">Total Collected</span>
                              <span className="font-semibold">{formatCurrency(summary?.totalPaid || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">Exempted Students</span>
                              <span className="font-semibold">{summary?.exemptedStudentCount ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">Total Enrolled (scope)</span>
                              <span className="font-semibold">{summary?.totalEligibleStudents ?? "—"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">Not Yet Paid</span>
                              <span className="font-semibold">{unpaidTotal}</span>
                            </div>
                          </div>
                        </div>

                        {isUniversity && targetColleges.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">College Statistics</p>
                            <div className="space-y-2">
                              {targetColleges.map((college) => (
                                <div key={college.name} className="rounded-md border p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm">{college.name}</p>
                                    <p className="text-xs text-gray-600">
                                      Collected: {formatCurrency(college.totalCollected || 0)}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="bg-green-50 text-green-800 rounded px-2 py-1">
                                      Paid: {college.paidCount}
                                    </div>
                                    <div className="bg-yellow-50 text-yellow-800 rounded px-2 py-1">
                                      Not paid: {college.unpaidCount}
                                    </div>
                                    <div className="bg-gray-100 text-gray-800 rounded px-2 py-1">
                                      Exempted: {college.exemptedCount}
                                    </div>
                                  </div>

                                  {college.courses && college.courses.length > 0 && (
                                    <div className="rounded-md bg-gray-50 p-2 space-y-2">
                                      <p className="text-xs font-semibold text-gray-700">Course Statistics</p>
                                      {renderCourseStats(college.courses)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isCollegeWide && targetColleges.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">
                              College Statistics{reportData.scopeCollege ? ` - ${reportData.scopeCollege}` : ""}
                            </p>
                            {targetColleges.map((college) => (
                              <div key={college.name} className="rounded-md border p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-sm">{college.name}</p>
                                  <p className="text-xs text-gray-600">
                                    Collected: {formatCurrency(college.totalCollected || 0)}
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="bg-green-50 text-green-800 rounded px-2 py-1">
                                    Paid: {college.paidCount}
                                  </div>
                                  <div className="bg-yellow-50 text-yellow-800 rounded px-2 py-1">
                                    Not paid: {college.unpaidCount}
                                  </div>
                                  <div className="bg-gray-100 text-gray-800 rounded px-2 py-1">
                                    Exempted: {college.exemptedCount}
                                  </div>
                                </div>
                                {college.courses && college.courses.length > 0 && (
                                  <div className="rounded-md bg-gray-50 p-2 space-y-2">
                                    <p className="text-xs font-semibold text-gray-700">Course Statistics</p>
                                    {renderCourseStats(college.courses)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {isCourseOnly && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">
                              Course Statistics{reportData.scopeCourse ? ` - ${reportData.scopeCourse}` : ""}
                            </p>
                            {courseOnlyStats.length === 0 ? (
                              <p className="text-xs text-gray-600">No course-level data available.</p>
                            ) : (
                              renderCourseStats(courseOnlyStats)
                            )}
                          </div>
                        )}

                        <div className="pt-2">
                          <Button
                            onClick={async () => {
                              if (!selectedFee?.id) return
                              try {
                                const res = await fetch(`/api/fees/${selectedFee.id}/report/pdf`)
                                if (!res.ok) {
                                  const data = await res.json().catch(() => ({}))
                                  await Swal.fire({
                                    icon: "error",
                                    title: "Download failed",
                                    text: data.error || "Failed to generate PDF",
                                    toast: true,
                                    position: "top-end",
                                    showConfirmButton: false,
                                    timer: 4000,
                                    timerProgressBar: true,
                                  })
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

                                await Swal.fire({
                                  icon: "success",
                                  title: "PDF download started",
                                  text: "Your fee report PDF is being downloaded.",
                                  toast: true,
                                  position: "top-end",
                                  showConfirmButton: false,
                                  timer: 3000,
                                  timerProgressBar: true,
                                })
                              } catch (e) {
                                console.error('PDF download failed', e)
                                await Swal.fire({
                                  icon: "error",
                                  title: "Download failed",
                                  text: "PDF download failed",
                                  toast: true,
                                  position: "top-end",
                                  showConfirmButton: false,
                                  timer: 4000,
                                  timerProgressBar: true,
                                })
                              }
                            }}
                          >
                            Download PDF
                          </Button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Fee Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewFee ? viewFee.name : "Fee Details"}
            </DialogTitle>
          </DialogHeader>

          {viewLoading || !viewFee ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading fee details...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Name</p>
                  <p className="text-sm">{viewFee.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Type</p>
                  <p className="text-sm capitalize">{viewFee.type}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Amount</p>
                  <p className="text-sm font-semibold">
                    ₱{Number(viewFee.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Due Date</p>
                  <p className="text-sm">{viewFee.dueDate || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Semester</p>
                  <p className="text-sm">{viewFee.semester || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">School Year</p>
                  <p className="text-sm">{viewFee.schoolYear || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Scope</p>
                  <p className="text-sm">
                    {viewFee.scope_type || "UNIVERSITY_WIDE"}
                  </p>
                  {viewFee.scope_college && (
                    <p className="text-xs text-gray-500">
                      College: {viewFee.scope_college}
                    </p>
                  )}
                  {viewFee.scope_course && (
                    <p className="text-xs text-gray-500">
                      Course: {viewFee.scope_course}
                    </p>
                  )}
                </div>
              </div>

              {viewFee.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Description</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {viewFee.description}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500">
                  Exempted Students
                </p>
                {viewExemptedStudents.length === 0 ? (
                  <p className="text-sm text-gray-500">None</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {viewExemptedStudents.map((s) => (
                      <div key={s.id} className="text-sm">
                        {s.name} ({s.studentId}){" "}
                        <span className="text-xs text-gray-500">{s.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 