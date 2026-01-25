import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EventForm } from "@/components/dashboard/event-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewEventPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (!['ADMIN','EVENTS_STAFF','COLLEGE_ORG'].includes(session.user.role as any)) {
    redirect("/dashboard")
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
              <h1 className="text-3xl font-bold tracking-tight">Add New Event</h1>
              <p className="text-muted-foreground">
                Create a new school event or activity
              </p>
            </div>
          </div>
        </div>
        
        <EventForm />
      </div>
    </DashboardShell>
  )
} 