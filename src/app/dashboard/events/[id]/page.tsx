import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EditEventForm } from "@/components/dashboard/edit-event-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const { data: rawEvent, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !rawEvent) {
    notFound()
  }

  // Transform database column names to match the TypeScript interface
  const event = {
    id: rawEvent.id,
    title: rawEvent.title || '',
    description: rawEvent.description || '',
    eventDate: rawEvent.date || '',
    startTime: rawEvent.start_time || '09:00',
    endTime: rawEvent.end_time || '17:00',
    location: rawEvent.location || '',
    eventType: rawEvent.type || 'ACADEMIC',
    capacity: rawEvent.max_capacity || 100,
    status: rawEvent.status || 'ACTIVE',
    scope_type: rawEvent.scope_type || 'UNIVERSITY_WIDE',
    scope_college: rawEvent.scope_college || '',
    scope_course: rawEvent.scope_course || ''
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
        </div>
        
        <EditEventForm eventId={params.id} initialData={event} />
      </div>
    </DashboardShell>
  )
} 