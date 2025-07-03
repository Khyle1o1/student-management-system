"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  MapPin,
  RefreshCw,
  Edit2,
  Save,
  X
} from "lucide-react"

interface StudentData {
  id: string
  studentId: string
  name: string
  email: string
  yearLevel: string
  course: string
  enrolledAt: string
  user: {
    id: string
    email: string
    role: string
  }
}

interface StudentProfileProps {
  studentId: string | null
}

export function StudentProfile({ studentId }: StudentProfileProps) {
  const [student, setStudent] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    course: "",
  })

  useEffect(() => {
    if (studentId) {
      fetchStudentData()
    }
  }, [studentId])

  const fetchStudentData = async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/students/profile/${studentId}`)
      if (response.ok) {
        const data = await response.json()
        setStudent(data)
        setFormData({
          name: data.name,
          email: data.email,
          course: data.course,
        })
      }
    } catch (error) {
      console.error("Error fetching student profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/students/profile/${studentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchStudentData()
        setEditing(false)
      } else {
        alert("Error updating profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Error updating profile")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (student) {
      setFormData({
        name: student.name,
        email: student.email,
        course: student.course,
      })
    }
    setEditing(false)
  }

  const getYearLevelDisplayText = (yearLevel: string) => {
    switch (yearLevel) {
      case "YEAR_1": return "1st Year"
      case "YEAR_2": return "2nd Year"
      case "YEAR_3": return "3rd Year"
      case "YEAR_4": return "4th Year"
      default: return yearLevel
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!student) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load profile information</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </CardTitle>
            {!editing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Student ID</Label>
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4 text-gray-400" />
                <span className="text-lg font-mono">{student.studentId}</span>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Full Name</Label>
              {editing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-lg">{student.name}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Email Address</Label>
              {editing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-lg">{student.email}</span>
                </div>
              )}
            </div>

            {/* Year Level */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Year Level</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Badge className="bg-blue-100 text-blue-800">
                  {getYearLevelDisplayText(student.yearLevel)}
                </Badge>
              </div>
            </div>

            {/* Course */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Course</Label>
              {editing ? (
                <Input
                  value={formData.course}
                  onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="Enter course"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <span className="text-lg">{student.course}</span>
                </div>
              )}
            </div>

            {/* Enrollment Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Enrolled Since</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-lg">
                  {new Date(student.enrolledAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Account Type</Label>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800">
                    {student.user.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Login Email</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{student.user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔐 Authentication Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              Your account uses Google OAuth for authentication. You can log in using your Google account
              associated with your student email address. If you need to change your login email, 
              please contact the system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 