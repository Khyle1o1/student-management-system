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
    phoneNumber?: string
    address?: string
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
    password: "",
    studentId: "",
    yearLevel: "",
    section: "",
    course: "",
    college: "",
    phoneNumber: "",
    address: "",
  })

  const isEditing = !!studentId

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        middleName: initialData.middleName || "",
        email: initialData.email,
        password: "", // Don't populate password for editing
        studentId: initialData.studentId,
        yearLevel: initialData.yearLevel,
        section: initialData.section,
        course: initialData.course,
        college: initialData.college,
        phoneNumber: initialData.phoneNumber || "",
        address: initialData.address || "",
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
      
      const payload = isEditing 
        ? formData // For editing, include all fields including optional password
        : { ...formData, password: formData.password || "student123" } // For new students, provide default password if empty

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

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="+63912345678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter complete address"
                rows={3}
                className="resize-none"
              />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {isEditing ? "(leave empty to keep current)" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required={!isEditing}
                  placeholder={isEditing ? "Enter new password (optional)" : "Enter password"}
                />
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
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                    <SelectItem value="5">Year 5</SelectItem>
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
              {isEditing ? "Update Student" : "Create Student"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 