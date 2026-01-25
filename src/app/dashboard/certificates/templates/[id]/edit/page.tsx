import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CertificateTemplateCreatorSimple } from "@/components/dashboard/certificate-template-creator-simple"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface EditCertificateTemplatePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditCertificateTemplatePage({ params }: Readonly<EditCertificateTemplatePageProps>) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  // ADMIN and EVENTS_STAFF can edit certificate templates
  if (session.user.role !== "ADMIN" && session.user.role !== "EVENTS_STAFF") {
    redirect("/403")
  }

  // Await params to fix Next.js 15 compatibility
  const { id } = await params

  // Fetch template data
  const { data: template, error } = await supabaseAdmin
    .from('certificate_templates')
    .select(`
      *,
      creator:users(
        id,
        name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (error || !template) {
    redirect("/dashboard/certificates/templates")
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <Link href={`/dashboard/certificates/templates/${template.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Template
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
              <p className="text-muted-foreground">
                Modify the certificate template &quot;{template.title}&quot;
              </p>
            </div>
          </div>
        </div>
        
        <CertificateTemplateCreatorSimple 
          templateId={template.id} 
          initialData={template}
        />
      </div>
    </DashboardShell>
  )
} 