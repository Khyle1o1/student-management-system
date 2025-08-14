import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EvaluationPreview } from "@/components/dashboard/evaluation-preview"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function EvaluationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const { id } = await params

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/evaluations">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Evaluations
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Evaluation Preview</h1>
              <p className="text-muted-foreground">
                Preview how this evaluation will appear to students
              </p>
            </div>
          </div>
        </div>
        
        <EvaluationPreview evaluationId={id} />
      </div>
    </DashboardShell>
  )
} 