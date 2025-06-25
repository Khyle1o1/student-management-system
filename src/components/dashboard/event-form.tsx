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
import { Save, Loader2, Calendar, Clock, MapPin, Users } from "lucide-react"

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
  }
}

export function EventForm({ eventId, initialData }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "",
    capacity: "",
    status: "upcoming",
  })

  const isEditing = !!eventId

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        eventDate: initialData.eventDate,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        location: initialData.location,
        eventType: initialData.eventType,
        capacity: initialData.capacity.toString(),
        status: initialData.status,
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEditing 
        ? `/api/events/${eventId}` 
        : "/api/events"
      
      const method = isEditing ? "PUT" : "POST"
      
      // Map frontend eventType values to backend enum values
      const mapEventType = (frontendType: string): string => {
        const typeMap: { [key: string]: string } = {
          'academic': 'ACADEMIC',
          'sports': 'EXTRACURRICULAR',
          'cultural': 'EXTRACURRICULAR', 
          'social': 'EXTRACURRICULAR',
          'workshop': 'WORKSHOP',
          'seminar': 'SEMINAR',
          'conference': 'MEETING',
          'competition': 'EXTRACURRICULAR'
        }
        return typeMap[frontendType] || 'OTHER'
      }

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
      
      if (!formData.eventType) {
        alert("Event type is required")
        setLoading(false)
        return
      }
      
      if (!formData.startTime) {
        alert("Start time is required")
        setLoading(false)
        return
      }
      
      if (!formData.location.trim()) {
        alert("Location is required")
        setLoading(false)
        return
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        type: mapEventType(formData.eventType),
        date: formData.eventDate,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        location: formData.location.trim(),
        maxCapacity: parseInt(formData.capacity) || undefined
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
        alert(error.error || "An error occurred")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred while saving the event")
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
        <CardTitle className="text-2xl flex items-center space-x-2">
          <Calendar className="h-6 w-6" />
          <span>{isEditing ? "Edit Event" : "Create New Event"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  required
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
                  <span>Start Time *</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange("startTime", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>End Time *</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Location *</span>
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  required
                  placeholder="e.g., Main Auditorium, Gym, Library"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type *</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => handleInputChange("eventType", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>Capacity *</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange("capacity", e.target.value)}
                  required
                  min="1"
                  placeholder="e.g., 100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
              {isEditing ? "Update Event" : "Create Event"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 