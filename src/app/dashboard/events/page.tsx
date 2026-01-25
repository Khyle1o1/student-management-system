import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EventsTable } from "@/components/dashboard/events-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { getOrgAccessLevelFromSession } from "@/lib/org-permissions"

interface EventsActionsProps {
  canManageEvents: boolean
}

function EventsActions({ canManageEvents }: EventsActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 w-full sm:w-auto gap-2 sm:gap-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 w-full sm:w-auto gap-2 sm:gap-0">
        <Link href="/dashboard/certificates/templates" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            Certificates
          </Button>
        </Link>
        <Link href="/dashboard/forms" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            Evaluations
          </Button>
        </Link>
      </div>

      {canManageEvents && (
        <Link href="/dashboard/events/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        </Link>
      )}
    </div>
  )
}

interface EventsHeaderProps {
  canManageEvents: boolean
}

function EventsHeader({ canManageEvents }: EventsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">
          Manage events, certificates, and student evaluations.
        </p>
      </div>
      <EventsActions canManageEvents={canManageEvents} />
    </div>
  )
}

export default async function EventsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (!['ADMIN','EVENTS_STAFF','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
    redirect("/dashboard")
  }

  const orgAccessLevel = getOrgAccessLevelFromSession(session as any)

  // Finance accounts cannot access Events module
  if (session.user.role === "COLLEGE_ORG" && orgAccessLevel === "finance") {
    redirect("/403")
  }

  // ADMIN, EVENTS_STAFF, and authorized org accounts can manage events
  const canManageEvents =
    session.user.role === 'ADMIN' ||
    session.user.role === 'EVENTS_STAFF' ||
    (session.user.role === 'COLLEGE_ORG' && (orgAccessLevel === "event" || orgAccessLevel === "college"))

  return (
    <DashboardShell>
      <div className="space-y-6">
        <EventsHeader canManageEvents={canManageEvents} />

        <EventsTable />
      </div>
    </DashboardShell>
  )
} 