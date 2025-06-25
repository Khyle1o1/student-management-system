import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EventsTable } from "@/components/dashboard/events-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function EventsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">
              Manage school events and activities
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </Link>
        </div>
        
        <EventsTable />
      </div>
    </DashboardShell>
  )
} 