import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CertificateTemplateCreatorSimple } from "@/components/dashboard/certificate-template-creator-simple"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewCertificateTemplatePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // ADMIN and EVENTS_STAFF can create certificate templates
  if (session.user.role !== "ADMIN" && session.user.role !== "EVENTS_STAFF") {
    redirect("/403")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/certificates/templates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Templates
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create Certificate Template</h1>
              <p className="text-muted-foreground">
                Upload your certificate background image. Name and certificate number are automatically positioned.
              </p>
            </div>
          </div>
        </div>
        
        <CertificateTemplateCreatorSimple />
      </div>
    </DashboardShell>
  )
} 