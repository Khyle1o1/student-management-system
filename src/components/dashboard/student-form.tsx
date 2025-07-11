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
import { Save, Loader2 } from "lucide-react"
import { COLLEGES, COURSES_BY_COLLEGE } from "@/lib/constants/academic-programs"

interface StudentFormProps {
  studentId?: string
  initialData?: {
    id: string
    studentId: string
    firstName: string
    lastName: string
    middleName?: string
    email: string
    yearLevel: string
    course: string
    college: string
  }
}

export function StudentForm({ studentId, initialData }: StudentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    studentId: "",
    yearLevel: "",
    course: "",
    college: "",
  })

  const isEditing = !!studentId

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        middleName: initialData.middleName || "",
        email: initialData.email,
        studentId: initialData.studentId,
        yearLevel: initialData.yearLevel,
        course: initialData.course,
        college: initialData.college,
      })
    }
  }, [initialData])

  // Auto-generate email when student ID changes
  useEffect(() => {
    if (formData.studentId && !isEditing) {
      setFormData(prev => ({
        ...prev,
        email: `${formData.studentId}@student.buksu.edu.ph`
      }))
    }
  }, [formData.studentId, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.studentId || 
          !formData.yearLevel || !formData.course || !formData.college) {
        alert("Please fill in all required fields")
        setLoading(false)
        return
      }

      const url = isEditing 
        ? `/api/students/${studentId}` 
        : "/api/students"
      
      const method = isEditing ? "PUT" : "POST"
      
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        email: formData.email,
        studentId: formData.studentId,
        yearLevel: formData.yearLevel,
        course: formData.course,
        college: formData.college,
        name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
        password: "" // Empty password for OAuth users
      }

      console.log('Submitting form data:', payload) // Add this for debugging

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Server error:', error) // Log the full error for debugging
        if (error.error && Array.isArray(error.error)) {
          // Handle Zod validation errors
          const errorMessages = error.error.map((err: any) => `${err.path.join('.')}: ${err.message}`).join('\n')
          alert(errorMessages)
        } else {
          // Handle other types of errors
          const errorMessage = error.error || error.message || "An error occurred while saving the student"
          alert(errorMessage)
        }
        return
      }

      router.push("/dashboard/students")
      router.refresh()
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred while saving the student. Please check the console for more details.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isEditing ? "Edit Student" : "Student Information"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Students will authenticate using Google OAuth only. No password is required.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  required
                  placeholder="e.g., Khyle Ivan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  required
                  placeholder="e.g., Amacna"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange("middleName", e.target.value)}
                  placeholder="e.g., Khim V."
                />
              </div>
            </div>
          </div>

          {/* Academic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Academic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => {
                    // Only allow numeric input
                    const value = e.target.value.replace(/\D/g, '')
                    handleInputChange("studentId", value)
                  }}
                  required
                  placeholder="e.g., 2101103309"
                  pattern="\d*"
                />
                <p className="text-xs text-muted-foreground">
                  Numbers only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Student Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  placeholder="Auto-generated from Student ID"
                  disabled={!isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  This email must match the student's Google account for OAuth login
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="college">College *</Label>
                <Select
                  value={formData.college}
                  onValueChange={(value) => {
                    handleInputChange("college", value)
                    // Reset course when college changes
                    handleInputChange("course", "")
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a college" />
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

              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select
                  value={formData.course}
                  onValueChange={(value) => handleInputChange("course", value)}
                  required
                  disabled={!formData.college}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.college &&
                      COURSES_BY_COLLEGE[formData.college as keyof typeof COURSES_BY_COLLEGE].map((course) => (
                        <SelectItem key={course} value={course}>
                          {course}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearLevel">Year Level *</Label>
                <Select
                  value={formData.yearLevel}
                  onValueChange={(value) => handleInputChange("yearLevel", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YEAR_1">1st Year</SelectItem>
                    <SelectItem value="YEAR_2">2nd Year</SelectItem>
                    <SelectItem value="YEAR_3">3rd Year</SelectItem>
                    <SelectItem value="YEAR_4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the student's current year level
                </p>
              </div>
            </div>
          </div>

          {/* Authentication Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔐 Authentication Method</h4>
            <p className="text-sm text-blue-700">
              Students will log in using their Google account associated with the email address above. 
              No password setup is required as authentication is handled through Google OAuth.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
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
              {isEditing ? "Update Student" : "Create Student"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 