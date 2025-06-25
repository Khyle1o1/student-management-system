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
    section: string
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
    section: "",
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
        section: initialData.section,
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
      const url = isEditing 
        ? `/api/students/${studentId}` 
        : "/api/students"
      
      const method = isEditing ? "PUT" : "POST"
      
      // Prepare payload without password, phone, or address
      const payload = {
        ...formData,
        name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
        // For OAuth-only students, no password needed
        password: "", // Empty password for OAuth users
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push("/dashboard/students")
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "An error occurred")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred while saving the student")
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
                  onChange={(e) => handleInputChange("studentId", e.target.value)}
                  required
                  placeholder="e.g., 2101103309"
                />
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
                  onValueChange={(value) => handleInputChange("college", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select college" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="College of Technology">College of Technology</SelectItem>
                    <SelectItem value="College of Engineering">College of Engineering</SelectItem>
                    <SelectItem value="College of Education">College of Education</SelectItem>
                    <SelectItem value="College of Business">College of Business</SelectItem>
                    <SelectItem value="College of Arts and Sciences">College of Arts and Sciences</SelectItem>
                    <SelectItem value="College of Medicine">College of Medicine</SelectItem>
                    <SelectItem value="College of Nursing">College of Nursing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Input
                  id="course"
                  value={formData.course}
                  onChange={(e) => handleInputChange("course", e.target.value)}
                  required
                  placeholder="e.g., BSIT, BSCS, BSEE"
                />
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
                    <SelectItem value="FIRST_YEAR">Year 1</SelectItem>
                    <SelectItem value="SECOND_YEAR">Year 2</SelectItem>
                    <SelectItem value="THIRD_YEAR">Year 3</SelectItem>
                    <SelectItem value="FOURTH_YEAR">Year 4</SelectItem>
                    <SelectItem value="GRADUATE">Graduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => handleInputChange("section", e.target.value)}
                  required
                  placeholder="e.g., A, B, C"
                />
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
          <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
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