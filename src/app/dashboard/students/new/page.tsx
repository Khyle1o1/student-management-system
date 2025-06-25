import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StudentForm } from "@/components/dashboard/student-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewStudentPage() {
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
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/students">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Students
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
              <p className="text-muted-foreground">
                Create a new student account and profile
              </p>
            </div>
          </div>
        </div>
        
        <StudentForm />
      </div>
    </DashboardShell>
  )
} 