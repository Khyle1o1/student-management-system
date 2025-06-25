import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EditEventForm } from "@/components/dashboard/edit-event-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

async function getEvent(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) return null

    return event
  } catch (error) {
    console.error("Error fetching event:", error)
    return null
  }
}

interface EditEventPageProps {
  params: {
    id: string
  }
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const event = await getEvent(params.id)

  if (!event) {
    notFound()
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