import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CertificateTemplatesTable } from "@/components/dashboard/certificate-templates-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function CertificateTemplatesPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // ADMIN and EVENTS_STAFF can manage certificate templates
  if (session.user.role !== "ADMIN" && session.user.role !== "EVENTS_STAFF") {
    redirect("/403")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Certificate Templates</h1>
            <p className="text-muted-foreground">
              Create and manage certificate templates for your events
            </p>
          </div>
          <Link href="/dashboard/certificates/templates/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        </div>
        
        <CertificateTemplatesTable />
      </div>
    </DashboardShell>
  )
} 