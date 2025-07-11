"use client"

import { useState, useEffect } from "react"
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
import { Save, Loader2, DollarSign, Calendar, GraduationCap, Users, AlertTriangle } from "lucide-react"
import { COLLEGES, COURSES_BY_COLLEGE, EVENT_SCOPE_TYPES, EVENT_SCOPE_LABELS, EVENT_SCOPE_DESCRIPTIONS } from "@/lib/constants/academic-programs"

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
  }
}

export function FeeForm({ feeId, initialData }: FeeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
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
    }
  }, [initialData])

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
        alert("Fee name is required")
        setLoading(false)
        return
      }
      
      if (!formData.type) {
        alert("Fee type is required")
        setLoading(false)
        return
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        alert("Valid amount is required")
        setLoading(false)
        return
      }
      
      if (!formData.schoolYear.trim()) {
        alert("School year is required")
        setLoading(false)
        return
      }

      // Scope validation
      if (formData.scope_type === "COLLEGE_WIDE" && !formData.scope_college) {
        alert("College must be selected for college-wide fees")
        setLoading(false)
        return
      }

      if (formData.scope_type === "COURSE_SPECIFIC" && (!formData.scope_college || !formData.scope_course)) {
        alert("Both college and course must be selected for course-specific fees")
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
        })
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
        router.push("/dashboard/fees")
        router.refresh()
      } else {
        const error = await response.json()
        console.error("API Error:", error)
        alert(error.error || "An error occurred")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred while saving the fee")
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
          <DollarSign className="h-6 w-6" />
          <span>{isEditing ? "Edit Fee" : "Create New Fee"}</span>
        </CardTitle>
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_SCOPE_TYPES.map((scopeType) => (
                      <SelectItem key={scopeType} value={scopeType}>
                        {EVENT_SCOPE_LABELS[scopeType]}
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
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select college" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGES.map((college) => (
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
                        disabled={!formData.scope_college}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type">Fee Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                  required
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
                  <DollarSign className="h-4 w-4" />
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
                />
              </div>
            </div>
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