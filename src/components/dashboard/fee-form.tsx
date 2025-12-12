"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, Loader2, CreditCard, Calendar, GraduationCap, Users, AlertTriangle, Search, X } from "lucide-react"
import { COLLEGES, COURSES_BY_COLLEGE, EVENT_SCOPE_TYPES, EVENT_SCOPE_LABELS, EVENT_SCOPE_DESCRIPTIONS } from "@/lib/constants/academic-programs"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

interface FeeFormProps {
  feeId?: string
  initialData?: {
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
    exempted_students?: string[]
  }
}

interface StudentOption {
  id: string
  studentId: string
  name: string
  email: string
}

export function FeeForm({ feeId, initialData }: FeeFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const role = session?.user?.role
  const assignedCollege = (session?.user as any)?.assigned_college || null
  const assignedCourse = (session?.user as any)?.assigned_course || null
  const assignedCourses: string[] = useMemo(() => {
    const arr = (session?.user as any)?.assigned_courses as string[] | undefined
    if (arr && Array.isArray(arr) && arr.length > 0) return arr
    return assignedCourse ? [assignedCourse] : []
  }, [session?.user, assignedCourse])
  const isAdmin = role === 'ADMIN'
  const isCollegeOrg = role === 'COLLEGE_ORG'
  const isCourseOrg = role === 'COURSE_ORG'
  const [loading, setLoading] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([])
  const [studentSearch, setStudentSearch] = useState("")
  const [studentPage, setStudentPage] = useState(1)
  const [studentsHasNext, setStudentsHasNext] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [exemptedStudents, setExemptedStudents] = useState<StudentOption[]>([])
  const [isExemptDialogOpen, setIsExemptDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    amount: "",
    description: "",
    dueDate: "",
    semester: "",
    schoolYear: "",
    scope_type: "UNIVERSITY_WIDE",
    scope_college: "",
    scope_course: "",
  })

  const isEditing = !!feeId
  const fieldsLocked = isEditing

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        amount: initialData.amount.toString(),
        description: initialData.description,
        dueDate: initialData.dueDate,
        semester: initialData.semester,
        schoolYear: initialData.schoolYear,
        scope_type: initialData.scope_type || "UNIVERSITY_WIDE",
        scope_college: initialData.scope_college || "",
        scope_course: initialData.scope_course || "",
      })

      // If there are existing exempted student IDs, load their details
      if (initialData.exempted_students && initialData.exempted_students.length > 0) {
        const loadExempted = async () => {
          try {
            const params = new URLSearchParams({
              ids: initialData.exempted_students!.join(","),
            })
            const res = await fetch(`/api/students/by-ids?${params.toString()}`)
            if (!res.ok) return
            const data = await res.json()
            const options: StudentOption[] = (data.students || []).map((s: any) => ({
              id: s.id,
              studentId: s.student_id,
              name: s.name,
              email: s.email,
            }))
            setExemptedStudents(options)
          } catch (error) {
            console.error("Failed to load exempted students for fee:", error)
          }
        }
        loadExempted()
      }
    }
  }, [initialData])

  // Initialize defaults for org roles
  useEffect(() => {
    if (!initialData && !feeId && (isCollegeOrg || isCourseOrg)) {
      setFormData(prev => {
        const next = { ...prev }
        if (isCollegeOrg) {
          next.scope_type = 'COLLEGE_WIDE'
          next.scope_college = assignedCollege || ""
          next.scope_course = ""
        } else if (isCourseOrg) {
          next.scope_type = 'COURSE_SPECIFIC'
          next.scope_college = assignedCollege || ""
          next.scope_course = (assignedCourses && assignedCourses.length > 0) ? assignedCourses[0] : ""
        }
        return next
      })
    }
  }, [initialData, feeId, isCollegeOrg, isCourseOrg, assignedCollege, assignedCourses])

  // Fetch active students for exemption selector with pagination and search
  const fetchStudents = async (page = 1, search = "") => {
    try {
      setStudentsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        filter: "active",
      })
      if (search) {
        params.set("search", search)
      }

      const response = await fetch(`/api/students?${params.toString()}`)
      if (!response.ok) {
        console.error("Failed to fetch students for exemption selector")
        return
      }

      const data = await response.json()
      const newOptions: StudentOption[] = (data.students || []).map((student: any) => ({
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
      }))

      setStudentOptions(prev =>
        page === 1
          ? newOptions
          : [
              ...prev,
              // Avoid duplicates in options when paginating
              ...newOptions.filter(
                (opt) => !prev.some((existing) => existing.id === opt.id)
              ),
            ]
      )
      setStudentsHasNext(!!data.pagination?.hasNext)
      setStudentPage(page)
    } catch (error) {
      console.error("Error fetching students for exemption selector:", error)
    } finally {
      setStudentsLoading(false)
    }
  }

  // Load first page of students when the dialog opens
  useEffect(() => {
    if (isExemptDialogOpen) {
      fetchStudents(1, studentSearch)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExemptDialogOpen])

  const handleStudentSearchChange = (value: string) => {
    setStudentSearch(value)
    // Reset to first page with new search term
    fetchStudents(1, value)
  }

  const toggleExemptedStudent = (student: StudentOption) => {
    setExemptedStudents((prev) => {
      const exists = prev.some((s) => s.id === student.id)
      if (exists) {
        return prev.filter((s) => s.id !== student.id)
      }
      return [...prev, student]
    })
  }

  const removeExemptedStudent = (id: string) => {
    setExemptedStudents((prev) => prev.filter((s) => s.id !== id))
  }

  const fetchStudentCount = async (
    scope: string,
    collegeId?: string,
    courseId?: string
  ) => {
    try {
      const params = new URLSearchParams({
        scope: scope,
        ...(collegeId && { collegeId }),
        ...(courseId && { courseId })
      })

      const response = await fetch(`/api/students/count?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStudentCount(data.count)
      } else {
        console.error('Failed to fetch student count')
      }
    } catch (error) {
      console.error('Error fetching student count:', error)
    }
  }

  // Update student count when scope changes
  useEffect(() => {
    if (formData.scope_type === "UNIVERSITY_WIDE") {
      fetchStudentCount("UNIVERSITY_WIDE")
    } else if (formData.scope_type === "COLLEGE_WIDE" && formData.scope_college) {
      fetchStudentCount("COLLEGE_WIDE", formData.scope_college)
    } else if (formData.scope_type === "COURSE_SPECIFIC" && formData.scope_course) {
      fetchStudentCount("COURSE_SPECIFIC", undefined, formData.scope_course)
    }
  }, [formData.scope_type, formData.scope_college, formData.scope_course])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEditing 
        ? `/api/fees/${feeId}` 
        : "/api/fees"
      
      const method = isEditing ? "PUT" : "POST"
      
      // Map frontend fee type values to backend enum values
      const mapFeeType = (frontendType: string): string => {
        const typeMap: { [key: string]: string } = {
          'organization fee': 'ORGANIZATION_FEE',
          'activity fee': 'ACTIVITY_FEE',
          'registration fee': 'REGISTRATION_FEE',
          'laboratory fee': 'LABORATORY_FEE',
          'library fee': 'LIBRARY_FEE',
          'other': 'OTHER'
        }
        return typeMap[frontendType] || 'OTHER'
      }

      // Validation - make sure required fields are not empty
      if (!formData.name.trim()) {
        await Swal.fire({
          icon: "warning",
          title: "Fee name required",
          text: "Please enter a fee name before saving.",
          confirmButtonColor: "#0f172a",
        })
        setLoading(false)
        return
      }
      
      if (!formData.type) {
        await Swal.fire({
          icon: "warning",
          title: "Fee type required",
          text: "Please select a fee type.",
          confirmButtonColor: "#0f172a",
        })
        setLoading(false)
        return
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        await Swal.fire({
          icon: "warning",
          title: "Valid amount required",
          text: "Please enter a fee amount greater than 0.",
          confirmButtonColor: "#0f172a",
        })
        setLoading(false)
        return
      }
      
      if (!formData.schoolYear.trim()) {
        await Swal.fire({
          icon: "warning",
          title: "School year required",
          text: "Please specify the school year for this fee.",
          confirmButtonColor: "#0f172a",
        })
        setLoading(false)
        return
      }

      // Scope validation
      if (formData.scope_type === "COLLEGE_WIDE" && !formData.scope_college) {
        await Swal.fire({
          icon: "warning",
          title: "College required",
          text: "Please select a college for college-wide fees.",
          confirmButtonColor: "#0f172a",
        })
        setLoading(false)
        return
      }

      if (formData.scope_type === "COURSE_SPECIFIC" && (!formData.scope_college || !formData.scope_course)) {
        await Swal.fire({
          icon: "warning",
          title: "College and course required",
          text: "Please select both a college and a course for course-specific fees.",
          confirmButtonColor: "#0f172a",
        })
        setLoading(false)
        return
      }

      const payload = {
        name: formData.name.trim(),
        type: mapFeeType(formData.type),
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || undefined,
        dueDate: formData.dueDate || undefined,
        semester: formData.semester.trim() || undefined,
        schoolYear: formData.schoolYear.trim(),
        scope_type: formData.scope_type,
        ...(formData.scope_type !== "UNIVERSITY_WIDE" && formData.scope_college && {
          scope_college: formData.scope_college
        }),
        ...(formData.scope_type === "COURSE_SPECIFIC" && formData.scope_course && {
          scope_course: formData.scope_course
        }),
        // Always send exempted_students as an array of unique IDs (can be empty)
        exempted_students: Array.from(
          new Set(exemptedStudents.map((student) => student.id))
        ),
      }

      console.log("Fee form data being sent:", payload)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await Swal.fire({
          icon: "success",
          title: isEditing ? "Fee updated" : "Fee created",
          text: "The fee has been saved successfully.",
          confirmButtonColor: "#0f172a",
        })
        router.push("/dashboard/fees")
        router.refresh()
      } else {
        const error = await response.json()
        console.error("API Error:", error)
        await Swal.fire({
          icon: "error",
          title: "Unable to save fee",
          text: error.error || "An error occurred while saving the fee.",
          confirmButtonColor: "#dc2626",
        })
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      await Swal.fire({
        icon: "error",
        title: "Unexpected error",
        text: "An error occurred while saving the fee. Please try again.",
        confirmButtonColor: "#dc2626",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      // Reset dependent fields when scope type changes
      if (name === "scope_type") {
        newData.scope_college = ""
        newData.scope_course = ""
      }
      
      // Reset course when college changes
      if (name === "scope_college") {
        newData.scope_course = ""
      }
      
      return newData
    })
  }

  const getAvailableCourses = () => {
    if (isCourseOrg) return assignedCourses || []
    if (!formData.scope_college) return []
    return COURSES_BY_COLLEGE[formData.scope_college as keyof typeof COURSES_BY_COLLEGE] || []
  }

  const getStudentImpact = () => {
    switch (formData.scope_type) {
      case "UNIVERSITY_WIDE":
        return studentCount ? `All students (${studentCount.toLocaleString()}) across all colleges` : "All students across all colleges"
      case "COLLEGE_WIDE":
        return formData.scope_college 
          ? `Students from ${formData.scope_college} only ${studentCount ? `(${studentCount.toLocaleString()} students)` : ''}`
          : "Students from selected college only"
      case "COURSE_SPECIFIC":
        return formData.scope_course 
          ? `Students from ${formData.scope_course} only ${studentCount ? `(${studentCount.toLocaleString()} students)` : ''}`
          : "Students from selected course only"
      default:
        return ""
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center space-x-2">
          <CreditCard className="h-6 w-6" />
          <span>{isEditing ? "Edit Fee" : "Create New Fee"}</span>
        </CardTitle>
        {isEditing && (
          <p className="text-sm text-muted-foreground">
            After a fee is created, only the name and exempted students can be
            changed. All other details are locked for consistency.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Fee Information</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Fee Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  placeholder="e.g., Organization Fee, Laboratory Fee"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Optional description of the fee..."
                  rows={3}
                  className="resize-none"
                  disabled={fieldsLocked}
                />
              </div>
            </div>
          </div>

          {/* Fee Scope Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Fee Scope</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scope_type">Who does this fee apply to? *</Label>
                <Select
                  value={formData.scope_type}
                  onValueChange={(value) => handleInputChange("scope_type", value)}
                  required
                  disabled={fieldsLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isAdmin ? EVENT_SCOPE_TYPES : isCollegeOrg ? ["COLLEGE_WIDE","COURSE_SPECIFIC"] : ["COURSE_SPECIFIC"]).map((scopeType) => (
                      <SelectItem key={scopeType} value={scopeType}>
                        {EVENT_SCOPE_LABELS[scopeType as keyof typeof EVENT_SCOPE_LABELS]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">
                  {EVENT_SCOPE_DESCRIPTIONS[formData.scope_type as keyof typeof EVENT_SCOPE_DESCRIPTIONS]}
                </p>
              </div>

              {formData.scope_type !== "UNIVERSITY_WIDE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope_college">College *</Label>
                    <Select
                      value={formData.scope_college}
                      onValueChange={(value) => handleInputChange("scope_college", value)}
                      required={formData.scope_type !== "UNIVERSITY_WIDE"}
                      disabled={fieldsLocked || isCollegeOrg || isCourseOrg}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select college" />
                      </SelectTrigger>
                      <SelectContent>
                        {(isAdmin ? COLLEGES : (assignedCollege ? [assignedCollege] : [])).map((college) => (
                          <SelectItem key={college} value={college}>
                            {college}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.scope_type === "COURSE_SPECIFIC" && (
                    <div className="space-y-2">
                      <Label htmlFor="scope_course">Course *</Label>
                      <Select
                        value={formData.scope_course}
                        onValueChange={(value) => handleInputChange("scope_course", value)}
                        required={formData.scope_type === "COURSE_SPECIFIC"}
                      disabled={fieldsLocked || !formData.scope_college}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableCourses().map((course) => (
                            <SelectItem key={course} value={course}>
                              {course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Fee Impact Indicator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Student Impact</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      This fee will apply to: {getStudentImpact()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Fee Details</h3>
            {/* Use a consistent 2-column layout on desktop so rows align cleanly */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type">Fee Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                  required
                  disabled={fieldsLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization fee">Organization Fee</SelectItem>
                    <SelectItem value="activity fee">Activity Fee</SelectItem>
                    <SelectItem value="registration fee">Registration Fee</SelectItem>
                    <SelectItem value="laboratory fee">Laboratory Fee</SelectItem>
                    <SelectItem value="library fee">Library Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center space-x-1">
                  <CreditCard className="h-4 w-4" />
                  <span>Amount *</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  required
                  placeholder="0.00"
                  disabled={fieldsLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Due Date</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                  disabled={fieldsLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester" className="flex items-center space-x-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>Semester</span>
                </Label>
                <Input
                  id="semester"
                  value={formData.semester}
                  onChange={(e) => handleInputChange("semester", e.target.value)}
                  placeholder="e.g., Fall 2024, Spring 2025"
                  disabled={fieldsLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolYear">School Year *</Label>
                <Input
                  id="schoolYear"
                  value={formData.schoolYear}
                  onChange={(e) => handleInputChange("schoolYear", e.target.value)}
                  required
                  placeholder="e.g., 2024-2025"
                  disabled={fieldsLocked}
                />
              </div>
            </div>
          </div>

          {/* Exempted Students Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Exempted Students</h3>
            <p className="text-sm text-gray-600">
              Select specific students who will be exempted from this fee. This is useful for scholarships,
              special cases, athletes, working students, and other exemptions.
            </p>

            <div className="space-y-3">
              {exemptedStudents.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No students exempted</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {exemptedStudents.map((student) => (
                    <span
                      key={student.id}
                      className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 border border-blue-200"
                    >
                      <span className="mr-2">
                        {student.name} ({student.studentId})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExemptedStudent(student.id)}
                        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                        aria-label={`Remove ${student.name} from exemptions`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setIsExemptDialogOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Select Students to Exempt
              </Button>
            </div>

            {/* Mobile-friendly full-screen selector using Dialog */}
            <Dialog open={isExemptDialogOpen} onOpenChange={setIsExemptDialogOpen}>
              <DialogContent className="max-w-2xl w-[95vw] h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Select Students to Exempt</DialogTitle>
                  <DialogDescription>
                    Search and select one or more active students to exempt from this fee.
                    On mobile, this view expands to a full-screen modal for easier searching.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID number, or email..."
                      value={studentSearch}
                      onChange={(e) => handleStudentSearchChange(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <div className="flex-1 border rounded-md">
                    <ScrollArea className="h-full">
                      <div className="divide-y">
                        {studentOptions.length === 0 && !studentsLoading && (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            No students found. Try adjusting your search.
                          </div>
                        )}
                        {studentOptions.map((student) => {
                          const isSelected = exemptedStudents.some((s) => s.id === student.id)
                          return (
                            <label
                              key={student.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleExemptedStudent(student)}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {student.name} ({student.studentId})
                                </span>
                                <span className="text-xs text-gray-500">{student.email}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  {studentsHasNext && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fetchStudents(studentPage + 1, studentSearch)}
                      disabled={studentsLoading}
                      className="w-full"
                    >
                      {studentsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Load more students
                    </Button>
                  )}
                </div>

                <DialogFooter className="pt-4 border-t mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsExemptDialogOpen(false)}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? "Update Fee" : "Create Fee"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 