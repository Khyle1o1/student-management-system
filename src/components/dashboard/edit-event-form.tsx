"use client"

import { EventForm } from "./event-form"

interface EditEventFormProps {
  eventId: string
  initialData: {
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

export function EditEventForm({ eventId, initialData }: EditEventFormProps) {
  return <EventForm eventId={eventId} initialData={initialData} />
} 