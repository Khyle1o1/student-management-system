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
import { Save, Loader2, Calendar, Clock, MapPin, AlertTriangle } from "lucide-react"
import { COLLEGES, COURSES_BY_COLLEGE, EVENT_SCOPE_TYPES, EVENT_SCOPE_LABELS, EVENT_SCOPE_DESCRIPTIONS } from "@/lib/constants/academic-programs"

interface EventFormProps {
  eventId?: string
  initialData?: {
    id: string
    title: string
    description: string
    eventDate: string
    startTime: string
    endTime: string
    location: string
    eventType: string
    capacity: number
    status: string
    scope_type: string
    scope_college: string
    scope_course: string
  }
}

export function EventForm({ eventId, initialData }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "ACADEMIC",
    max_capacity: 100,
    scope_type: "UNIVERSITY_WIDE",
    scope_college: "",
    scope_course: "",
  })

  const isEditing = !!eventId

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        eventDate: initialData.eventDate || "",
        startTime: initialData.startTime || "09:00",
        endTime: initialData.endTime || "17:00",
        location: initialData.location || "",
        type: initialData.eventType || "ACADEMIC",
        max_capacity: initialData.capacity || 100,
        scope_type: initialData.scope_type || "UNIVERSITY_WIDE",
        scope_college: initialData.scope_college || "",
        scope_course: initialData.scope_course || "",
      })
    }
  }, [initialData])

  useEffect(() => {
    // Load event data if editing
    const loadEventData = async () => {
      if (eventId) {
        try {
          const response = await fetch(`/api/events/${eventId}`)
          if (response.ok) {
            const data = await response.json()
            setFormData({
              title: data.title || "",
              description: data.description || "",
              eventDate: data.eventDate || "",
              startTime: data.startTime || "09:00",
              endTime: data.endTime || "17:00",
              location: data.location || "",
              type: data.eventType || "ACADEMIC",
              max_capacity: data.capacity || 100,
              scope_type: data.scope_type || "UNIVERSITY_WIDE",
              scope_college: data.scope_college || "",
              scope_course: data.scope_course || "",
            })
          } else {
            console.error('Failed to load event data')
          }
        } catch (error) {
          console.error('Error loading event:', error)
        }
      }
    }

    loadEventData()
  }, [eventId])

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
        // Update max capacity based on student count
        handleInputChange("max_capacity", data.count)
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
        ? `/api/events/${eventId}` 
        : "/api/events"
      
      const method = isEditing ? "PUT" : "POST"

      // Validation - make sure required fields are not empty
      if (!formData.title.trim()) {
        alert("Event title is required")
        setLoading(false)
        return
      }
      
      if (!formData.eventDate) {
        alert("Event date is required")
        setLoading(false)
        return
      }

      // Scope validation
      if (formData.scope_type === "COLLEGE_WIDE" && !formData.scope_college) {
        alert("College must be selected for college-wide events")
        setLoading(false)
        return
      }

      if (formData.scope_type === "COURSE_SPECIFIC" && (!formData.scope_college || !formData.scope_course)) {
        alert("Both college and course must be selected for course-specific events")
        setLoading(false)
        return
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.eventDate,
        startTime: formData.startTime || "09:00",
        endTime: formData.endTime || "17:00",
        location: formData.location.trim(), // Will be ignored by API if column doesn't exist
        type: formData.type,
        max_capacity: formData.max_capacity,
        scope_type: formData.scope_type,
        scope_college: formData.scope_type !== "UNIVERSITY_WIDE" ? formData.scope_college : null,
        scope_course: formData.scope_type === "COURSE_SPECIFIC" ? formData.scope_course : null,
      }

      console.log("Form data being sent:", payload)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push("/dashboard/events")
        router.refresh()
      } else {
        const error = await response.json()
        console.error("API Error:", error)
        
        if (error.missingColumn) {
          setMigrationRequired(true)
          alert(`Database column missing: ${error.missingColumn}. Event created but some fields may not be stored.`)
          // Still redirect since the basic event was likely created
          router.push("/dashboard/events")
          router.refresh()
        } else {
          alert(error.error || "An error occurred")
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred while saving the event")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (name: string, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      // Reset dependent fields when scope type changes
      if (name === "scope_type") {
        newData.scope_college = ""
        newData.scope_course = ""
        // Reset max capacity when scope changes
        newData.max_capacity = 0
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

  const getAttendanceImpact = () => {
    switch (formData.scope_type) {
      case "UNIVERSITY_WIDE":
        return "All students (≈7,300) across all colleges"
      case "COLLEGE_WIDE":
        return formData.scope_college 
          ? `Students from ${formData.scope_college} only`
          : "Students from selected college only"
      case "COURSE_SPECIFIC":
        return formData.scope_course 
          ? `Students from ${formData.scope_course} only`
          : "Students from selected course only"
      default:
        return ""
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center space-x-2">
          <Calendar className="h-6 w-6" />
          <span>{isEditing ? "Edit Event" : "Create New Event"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {migrationRequired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h4 className="font-medium text-yellow-900">Database Schema Incomplete</h4>
            </div>
            <p className="text-sm text-yellow-800 mt-2">
              Some database columns are missing. Event was created with available fields.
              Apply <code className="bg-yellow-100 px-1 rounded">migration_complete_events_schema.sql</code> to enable all features.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                  placeholder="e.g., Annual Science Fair 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe the event details, objectives, and what participants can expect..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Event Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Event Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type">Event Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACADEMIC">Academic</SelectItem>
                    <SelectItem value="EXTRACURRICULAR">Extracurricular</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="SEMINAR">Seminar</SelectItem>
                    <SelectItem value="WORKSHOP">Workshop</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_capacity">Maximum Capacity</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="max_capacity"
                    type="number"
                    value={formData.max_capacity}
                    disabled
                    className="bg-gray-50"
                  />
                  <div className="text-sm text-gray-500">
                    {studentCount !== null ? (
                      <span>Based on {studentCount} eligible students</span>
                    ) : (
                      <span>Calculating...</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Capacity is automatically set based on the number of eligible students for this event's scope.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate" className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Event Date *</span>
                </Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => handleInputChange("eventDate", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Start Time</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange("startTime", e.target.value)}
                  placeholder="09:00"
                />
                <p className="text-xs text-gray-500">Defaults to 09:00 if not specified</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>End Time</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                  placeholder="17:00"
                />
                <p className="text-xs text-gray-500">Defaults to 17:00 if not specified</p>
              </div>

              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="location" className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="e.g., Main Auditorium, Gym, Online"
                />
              </div>
            </div>
          </div>

          {/* Event Scope Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Event Scope</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scope_type">Who can attend this event? *</Label>
                <Select
                  value={formData.scope_type}
                  onValueChange={(value) => handleInputChange("scope_type", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_SCOPE_TYPES.map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {EVENT_SCOPE_LABELS[scope]}
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

              {/* Attendance Impact */}
              {studentCount !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">📊 Expected Attendance</h4>
                  <p className="text-sm text-blue-800">
                    <strong>Eligible attendees:</strong> {studentCount} students
                    {formData.scope_type === "UNIVERSITY_WIDE" && " across all colleges"}
                    {formData.scope_type === "COLLEGE_WIDE" && ` from ${formData.scope_college}`}
                    {formData.scope_type === "COURSE_SPECIFIC" && ` enrolled in ${formData.scope_course}`}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Reports and attendance tracking will include only these {studentCount} eligible students.
                  </p>
                </div>
              )}
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
              {isEditing ? "Update Event" : "Create Event"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 