"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Save, Loader2, Calendar, Clock, MapPin, AlertTriangle, CheckSquare, ClipboardCheck, RefreshCw } from "lucide-react"
import { COLLEGES, COURSES_BY_COLLEGE, EVENT_SCOPE_TYPES, EVENT_SCOPE_LABELS, EVENT_SCOPE_DESCRIPTIONS } from "@/lib/constants/academic-programs"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

interface Evaluation {
  id: string
  title: string
  description?: string
}

interface CertificateTemplate {
  id: string
  title: string
  description?: string
  is_active: boolean
  dynamic_fields: any[]
}

interface EventFormProps {
  eventId?: string
  initialData?: any
}

export function EventForm({ eventId, initialData }: EventFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const role = userRole
  const assignedCollege = (session?.user as any)?.assigned_college || null
  const assignedCourse = (session?.user as any)?.assigned_course || null
  const assignedCourses: string[] = useMemo(() => {
    const arr = (session?.user as any)?.assigned_courses as string[] | undefined
    if (arr && Array.isArray(arr) && arr.length > 0) return arr
    return assignedCourse ? [assignedCourse] : []
  }, [session?.user, assignedCourse])
  const isAdmin = userRole === 'ADMIN'
  const isEventsStaff = userRole === 'EVENTS_STAFF'
  const isCollegeOrg = userRole === 'COLLEGE_ORG'
  const isCourseOrg = userRole === 'COURSE_ORG'
  const [loading, setLoading] = useState(false)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [certificateTemplates, setCertificateTemplates] = useState<CertificateTemplate[]>([])
  const [loadingEvaluations, setLoadingEvaluations] = useState(false)
  const [loadingCertificateTemplates, setLoadingCertificateTemplates] = useState(false)
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
    require_evaluation: false,
    evaluation_id: "",
    certificate_template_id: "",
    attendance_type: "IN_ONLY",
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
        require_evaluation: initialData.require_evaluation || false,
        evaluation_id: initialData.evaluation?.id || "",
        certificate_template_id: initialData.certificate_template?.id || "",
        attendance_type: initialData.attendance_type || "IN_ONLY",
      })
    }
  }, [initialData])

  // Initialize defaults based on role when creating
  useEffect(() => {
    if (!initialData && !eventId && (isCollegeOrg || isCourseOrg)) {
      setFormData(prev => {
        const desired = { ...prev }
        if (isCollegeOrg) {
          desired.scope_type = 'COLLEGE_WIDE'
          desired.scope_college = assignedCollege || ""
          desired.scope_course = ""
        } else if (isCourseOrg) {
          desired.scope_type = 'COURSE_SPECIFIC'
          desired.scope_college = assignedCollege || ""
          desired.scope_course = (assignedCourses && assignedCourses.length > 0) ? assignedCourses[0] : ""
        }
        const changed = desired.scope_type !== prev.scope_type || desired.scope_college !== prev.scope_college || desired.scope_course !== prev.scope_course
        return changed ? desired : prev
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, initialData, isCollegeOrg, isCourseOrg, assignedCollege, assignedCourses])

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
              eventDate: data.date || data.eventDate || "",
              startTime: data.start_time || data.startTime || "09:00",
              endTime: data.end_time || data.endTime || "17:00",
              location: data.location || "",
              type: data.type || data.eventType || "ACADEMIC",
              max_capacity: data.max_capacity || data.capacity || 100,
              scope_type: data.scope_type || "UNIVERSITY_WIDE",
              scope_college: data.scope_college || "",
              scope_course: data.scope_course || "",
              require_evaluation: data.require_evaluation || false,
              evaluation_id: data.evaluation_id || data.evaluation?.id || "",
              certificate_template_id: data.certificate_template?.id || "",
              attendance_type: data.attendance_type || "IN_ONLY",
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

  // Load evaluation forms from new forms system
  // Excludes forms that are already used in other events (except current event when editing)
  const fetchEvaluations = useCallback(async () => {
    setLoadingEvaluations(true)
    try {
      // Fetch all published forms
      const formsResponse = await fetch('/api/forms?status=PUBLISHED&limit=100')
      if (!formsResponse.ok) {
        console.error('Failed to fetch forms')
        setEvaluations([])
        return
      }
      
      const formsData = await formsResponse.json()
      const allForms = formsData.forms || []
      
      // Get current evaluation ID (from formData or by fetching event if editing)
      let currentEvaluationId: string | null = formData.evaluation_id || null
      if (isEditing && eventId && !currentEvaluationId) {
        try {
          const eventResponse = await fetch(`/api/events/${eventId}`)
          if (eventResponse.ok) {
            const eventData = await eventResponse.json()
            currentEvaluationId = eventData.evaluation_id || null
          }
        } catch (error) {
          console.error('Error fetching current event:', error)
        }
      }
      
      // Fetch all events to get used evaluation IDs
      const eventsResponse = await fetch('/api/events?limit=1000')
      let usedEvaluationIds: string[] = []
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        // Extract all evaluation_ids that are not null, excluding current event's evaluation
        usedEvaluationIds = (eventsData.events || [])
          .map((event: any) => event.evaluation_id)
          .filter((id: string | null) => id && id !== currentEvaluationId) // Exclude current event's evaluation
      }
      
      // Filter out forms that are already used in other events
      // Always include the currently selected form if editing
      const availableForms = allForms.filter((form: Evaluation) => {
        // If editing and this is the current evaluation, always include it
        if (isEditing && form.id === currentEvaluationId) {
          return true
        }
        // Otherwise, only include if it's not used in another event
        return !usedEvaluationIds.includes(form.id)
      })
      
      setEvaluations(availableForms)
    } catch (error) {
      console.error('Error fetching forms:', error)
      setEvaluations([])
    } finally {
      setLoadingEvaluations(false)
    }
  }, [isEditing, eventId, formData.evaluation_id])

  // Refresh evaluations list when evaluation_id changes (for edit mode)
  useEffect(() => {
    if (isEditing && formData.evaluation_id) {
      fetchEvaluations()
    }
  }, [isEditing, formData.evaluation_id, fetchEvaluations])

  const fetchCertificateTemplates = useCallback(async () => {
    try {
      setLoadingCertificateTemplates(true)
      const response = await fetch('/api/certificate-templates?active_only=true')
      const data = await response.json()
      
      if (response.ok) {
        setCertificateTemplates(data.templates || [])
      } else {
        console.error('Failed to fetch certificate templates:', data.error)
      }
    } catch (error) {
      console.error('Error fetching certificate templates:', error)
    } finally {
      setLoadingCertificateTemplates(false)
    }
  }, [])

  // Fetch evaluations and (admin-only) certificate templates when component mounts
  useEffect(() => {
    fetchEvaluations()
    if (isAdmin) {
      fetchCertificateTemplates()
    }
  }, [fetchEvaluations, fetchCertificateTemplates, isAdmin])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // If require_evaluation is disabled, clear evaluation_id
      if (field === 'require_evaluation' && !value) {
        newData.evaluation_id = ""
      }
      
      // If require_evaluation is enabled, refresh the evaluations list
      if (field === 'require_evaluation' && value) {
        fetchEvaluations()
      }
      
      // Reset college and course when scope changes
      if (field === "scope_type") {
        if (value === "UNIVERSITY_WIDE") {
          newData.scope_college = ""
          newData.scope_course = ""
        } else if (value === "COLLEGE_WIDE") {
          newData.scope_course = ""
        }
      }
      
      // Reset course when college changes
      if (field === "scope_college") {
        newData.scope_course = ""
      }
      
      return newData
    })
  }

  const getAvailableCourses = () => {
    if (isCourseOrg) {
      return assignedCourses || []
    }
    if (!formData.scope_college || !COURSES_BY_COLLEGE[formData.scope_college as keyof typeof COURSES_BY_COLLEGE]) {
      return []
    }
    return COURSES_BY_COLLEGE[formData.scope_college as keyof typeof COURSES_BY_COLLEGE]
  }

  const fetchStudentCount = useCallback(async (
    scope: string,
    collegeId?: string,
    courseId?: string
  ) => {
    try {
      const params = new URLSearchParams({
        scope,
        ...(collegeId && { college: collegeId }),
        ...(courseId && { course: courseId })
      })
      
      const response = await fetch(`/api/students/count?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setStudentCount(data.count)
        setFormData(prev => ({
          ...prev,
          max_capacity: data.count
        }))
      } else {
        console.error("Failed to fetch student count")
      }
    } catch (error) {
      console.error("Error fetching student count:", error)
    }
  }, [])

  // Update student count when scope changes
  useEffect(() => {
    if (formData.scope_type === "UNIVERSITY_WIDE") {
      fetchStudentCount("UNIVERSITY_WIDE")
    } else if (formData.scope_type === "COLLEGE_WIDE" && formData.scope_college) {
      fetchStudentCount("COLLEGE_WIDE", formData.scope_college)
    } else if (formData.scope_type === "COURSE_SPECIFIC" && formData.scope_course) {
      fetchStudentCount("COURSE_SPECIFIC", undefined, formData.scope_course)
    }
  }, [formData.scope_type, formData.scope_college, formData.scope_course, fetchStudentCount])

  // Enforce scope constraints on the client based on role
  useEffect(() => {
    setFormData(prev => {
      const next = { ...prev }
      let changed = false
      if (isCollegeOrg) {
        if (next.scope_type === 'UNIVERSITY_WIDE') { next.scope_type = 'COLLEGE_WIDE'; changed = true }
        if (next.scope_college !== (assignedCollege || "")) { next.scope_college = assignedCollege || ""; changed = true }
      } else if (isCourseOrg) {
        if (next.scope_type !== 'COURSE_SPECIFIC') { next.scope_type = 'COURSE_SPECIFIC'; changed = true }
        if (next.scope_college !== (assignedCollege || "")) { next.scope_college = assignedCollege || ""; changed = true }
        const desiredCourse = (assignedCourses && assignedCourses.length > 0) ? assignedCourses[0] : ""
        if (!next.scope_course || !assignedCourses.includes(next.scope_course)) { next.scope_course = desiredCourse; changed = true }
      }
      return changed ? next : prev
    })
  }, [isCollegeOrg, isCourseOrg, assignedCollege, assignedCourses])

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

      // Evaluation validation
      if (formData.require_evaluation && !formData.evaluation_id) {
        alert("Please select an evaluation template when requiring evaluation")
        setLoading(false)
        return
      }

      // Final guardrails based on role
      const canSetAnyScopeType = isAdmin || isEventsStaff
      const enforcedScopeType = canSetAnyScopeType ? formData.scope_type : (isCollegeOrg ? (formData.scope_type === 'COURSE_SPECIFIC' ? 'COURSE_SPECIFIC' : 'COLLEGE_WIDE') : 'COURSE_SPECIFIC')
      const enforcedCollege = canSetAnyScopeType ? (formData.scope_type !== "UNIVERSITY_WIDE" ? formData.scope_college : null) : (assignedCollege)
      const enforcedCourse = canSetAnyScopeType 
        ? (formData.scope_type === "COURSE_SPECIFIC" ? formData.scope_course : null)
        : (isCourseOrg ? ((assignedCourses && assignedCourses.length > 0) ? formData.scope_course : assignedCourse) : (formData.scope_type === 'COURSE_SPECIFIC' ? formData.scope_course : null))

      const scopeTypeForApi = enforcedScopeType === 'COLLEGE_WIDE' ? 'COLLEGE' : (enforcedScopeType === 'COURSE_SPECIFIC' ? 'COURSE' : 'UNIVERSITY_WIDE')

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.eventDate,
        start_time: formData.startTime || null,
        end_time: formData.endTime || null,
        location: formData.location.trim(),
        type: formData.type,
        max_capacity: formData.max_capacity,
        scope_type: scopeTypeForApi,
        scope_college: enforcedScopeType !== "UNIVERSITY_WIDE" ? enforcedCollege : null,
        scope_course: enforcedScopeType === "COURSE_SPECIFIC" ? enforcedCourse : null,
        require_evaluation: formData.require_evaluation,
        evaluation_id: formData.require_evaluation ? formData.evaluation_id : null,
        certificate_template_id: formData.certificate_template_id,
        attendance_type: formData.attendance_type,
      }

      console.log('Submitting event payload:', payload)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log("Event created/updated successfully")
        
        // Different messages for admins vs org users
        const isOrgUser = role === 'COLLEGE_ORG' || role === 'COURSE_ORG'
        const isAdmin = role === 'ADMIN'
        
        if (isEditing) {
          await Swal.fire({
            icon: "success",
            title: "Event updated",
            text: "The event has been updated successfully.",
            confirmButtonColor: "#0f172a",
          })
        } else {
          // Different message for org users creating new events
          if (isOrgUser) {
            await Swal.fire({
              icon: "success",
              title: "Event submitted successfully",
              html: `
                <p style="margin-bottom: 10px;">Your event has been submitted and is pending approval.</p>
                <p style="color: #4caf50; font-weight: bold;">✓ Admin has been notified via email for approval.</p>
              `,
              confirmButtonColor: "#0f172a",
            })
          } else {
            await Swal.fire({
              icon: "success",
              title: "Event created",
              text: "The event has been created and activated successfully.",
              confirmButtonColor: "#0f172a",
            })
          }
        }
        
        router.push("/dashboard/events")
      } else {
        console.error("Failed to create/update event:", data)
        
        if (data.missingColumn) {
          setMigrationRequired(true)
          alert(`Migration required: The '${data.missingColumn}' column is missing from the events table. Please apply the database migration.`)
        } else if (data.error) {
          alert(`Error: ${data.error}`)
        } else {
          alert("Failed to create event. Please try again.")
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isEditing ? "Edit Event" : "Create New Event"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {migrationRequired && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h4 className="font-medium text-red-800">Database Migration Required</h4>
            </div>
            <p className="text-sm text-red-700 mt-2">
              The events table is missing required columns. Please apply the <code>certificate_evaluation_migration.sql</code> migration to enable all features.
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
                  Capacity is automatically set based on the number of eligible students for this event&apos;s scope.
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

              <div className="space-y-3 lg:col-span-3">
                <Label className="flex items-center space-x-1">
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Attendance Type</span>
                </Label>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      id="attendance_in_only"
                      name="attendance_type"
                      value="IN_ONLY"
                      checked={formData.attendance_type === "IN_ONLY"}
                      onChange={(e) => handleInputChange("attendance_type", e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="attendance_in_only" className="flex-1 cursor-pointer">
                      <div className="font-medium text-gray-900">In only</div>
                      <div className="text-sm text-gray-600">Simple attendance tracking - records check-in time only</div>
                    </label>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      id="attendance_in_out"
                      name="attendance_type"
                      value="IN_OUT"
                      checked={formData.attendance_type === "IN_OUT"}
                      onChange={(e) => handleInputChange("attendance_type", e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="attendance_in_out" className="flex-1 cursor-pointer">
                      <div className="font-medium text-gray-900">In & Out</div>
                      <div className="text-sm text-gray-600">Requires both entry and exit time - tracks full participation</div>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This setting determines how attendance will be recorded and validated for this event.
                </p>
              </div>
            </div>
          </div>

          {/* Evaluation Requirements Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Evaluation & Certificates</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="require_evaluation"
                  checked={formData.require_evaluation}
                  onChange={(e) => handleInputChange("require_evaluation", e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="require_evaluation" className="flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4" />
                  <span>Require evaluation for certificate access</span>
                </Label>
              </div>
              
              <p className="text-sm text-gray-600">
                When enabled, students must complete an evaluation before they can access their certificate of participation.
              </p>

              {formData.require_evaluation && (
                <div className="space-y-2 pl-6 border-l-2 border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="evaluation_id">Select Evaluation Template *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={fetchEvaluations}
                      disabled={loadingEvaluations}
                      className="h-8 px-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingEvaluations ? 'animate-spin' : ''}`} />
                      <span className="ml-1 text-xs">Refresh</span>
                    </Button>
                  </div>
                  <Select
                    value={formData.evaluation_id || undefined}
                    onValueChange={(value) => handleInputChange("evaluation_id", value)}
                    disabled={loadingEvaluations}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingEvaluations ? "Loading evaluations..." : "Choose an evaluation template"} />
                    </SelectTrigger>
                    <SelectContent>
                      {evaluations.map((evaluation) => (
                        <SelectItem key={evaluation.id} value={evaluation.id}>
                          <div>
                            <div className="font-medium">{evaluation.title}</div>
                            {evaluation.description && (
                              <div className="text-xs text-gray-500 truncate">
                                {evaluation.description.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {evaluations.length === 0 && !loadingEvaluations && (
                    <div className="text-sm text-gray-600">
                      No evaluation templates found. <a href="/dashboard/forms/new" className="text-blue-600 hover:underline" target="_blank">Create one first</a>.
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-600">
                    Students will need to complete this evaluation to unlock their certificates.
                  </p>
                  
                  {evaluations.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Note: Forms that are already assigned to other events are not shown. Each form can only be used once.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Certificate Template Selection (Admin only) */}
          {isAdmin && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Certificate Template</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="require_certificate"
                  checked={!!formData.certificate_template_id}
                  onChange={(e) => handleInputChange("certificate_template_id", e.target.checked ? (certificateTemplates.length > 0 ? certificateTemplates[0].id : "") : "")}
                  className="h-4 w-4"
                />
                <Label htmlFor="require_certificate" className="flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4" />
                  <span>Generate certificates for this event</span>
                </Label>
              </div>
              
              <p className="text-sm text-gray-600">
                When enabled, students who attend this event will receive a certificate of participation using the selected template.
              </p>

              {formData.certificate_template_id && (
                <div className="space-y-2 pl-6 border-l-2 border-green-200 bg-green-50 p-4">
                  <Label htmlFor="certificate_template_id">Select Certificate Template *</Label>
                  <Select
                    value={formData.certificate_template_id || undefined}
                    onValueChange={(value) => handleInputChange("certificate_template_id", value)}
                    disabled={loadingCertificateTemplates}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCertificateTemplates ? "Loading templates..." : "Choose a certificate template"} />
                    </SelectTrigger>
                    <SelectContent>
                      {certificateTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div>
                            <div className="font-medium">{template.title}</div>
                            {template.description && (
                              <div className="text-xs text-gray-500 truncate">
                                {template.description.substring(0, 50)}...
                              </div>
                            )}
                            <div className="text-xs text-gray-400">
                              {template.dynamic_fields?.length || 0} fields
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {certificateTemplates.length === 0 && (
                    <div className="text-sm text-gray-600">
                      No certificate templates found. <a href="/dashboard/certificates/templates/new" className="text-blue-600 hover:underline">Create one first</a>.
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-600">
                    Students will receive a certificate of participation using this template after attending the event.
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

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
                    {(isAdmin || isEventsStaff
                      ? EVENT_SCOPE_TYPES
                      : isCollegeOrg
                        ? ["COLLEGE_WIDE","COURSE_SPECIFIC"]
                        : ["COURSE_SPECIFIC"]
                    ).map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {EVENT_SCOPE_LABELS[scope as keyof typeof EVENT_SCOPE_LABELS]}
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
                      value={formData.scope_college || undefined}
                      onValueChange={(value) => handleInputChange("scope_college", value)}
                      required={formData.scope_type !== "UNIVERSITY_WIDE"}
                      disabled={isCollegeOrg || isCourseOrg}
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
                        value={formData.scope_course || undefined}
                        onValueChange={(value) => handleInputChange("scope_course", value)}
                        required={formData.scope_type === "COURSE_SPECIFIC"}
                        disabled={!formData.scope_college}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableCourses().map((course: string) => (
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