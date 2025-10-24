"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EditEventForm } from "@/components/dashboard/edit-event-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('')
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initializePage = async () => {
      try {
        const resolvedParams = await params
        setId(resolvedParams.id)
        
        // Check authentication
        const sessionResponse = await fetch('/api/auth/session')
        if (!sessionResponse.ok) {
          router.push('/auth/login')
          return
        }
        
        const session = await sessionResponse.json()
        if (session.user?.role !== 'ADMIN') {
          router.push('/dashboard')
          return
        }

        // Fetch event data
        const eventResponse = await fetch(`/api/events/${resolvedParams.id}`)
        if (!eventResponse.ok) {
          router.push('/dashboard/events')
          return
        }

        const eventData = await eventResponse.json()
        setEvent({
          id: eventData.id,
          title: eventData.title || '',
          description: eventData.description || '',
          eventDate: eventData.date || '',
          startTime: eventData.start_time || '09:00',
          endTime: eventData.end_time || '17:00',
          location: eventData.location || '',
          eventType: eventData.type || 'ACADEMIC',
          capacity: eventData.max_capacity || 100,
          status: eventData.status || 'ACTIVE',
          scope_type: eventData.scope_type || 'UNIVERSITY_WIDE',
          scope_college: eventData.scope_college || '',
          scope_course: eventData.scope_course || ''
        })
      } catch (error) {
        console.error('Error initializing page:', error)
        router.push('/dashboard/events')
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [params, router])

  if (loading || !event) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading event...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/events">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
              <p className="text-muted-foreground">
                Update event information for {event.title}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/events/${id}/report`);
                  
                  if (!response.ok) {
                    const error = await response.json();
                    if (response.status === 404) {
                      alert('Event not found. The event may have been deleted. Redirecting to events page...');
                      router.push('/dashboard/events');
                    } else {
                      alert(`Failed to generate report: ${error.error || 'Unknown error'}`);
                    }
                    return;
                  }
                  
                  // Download the PDF
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `event-report-${event?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'event'}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error('Error generating report:', error);
                  alert('Failed to generate report. Please try again.');
                }
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate PDF Report
            </Button>
          </div>
        </div>
        
        <EditEventForm eventId={id} initialData={event} />
      </div>
    </DashboardShell>
  )
} 