import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StudentsTable } from "@/components/dashboard/students-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function StudentsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (!['ADMIN','COLLEGE_ORG','COURSE_ORG'].includes(session.user.role as any)) {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage student records and information
            </p>
          </div>
          {session.user.role === 'ADMIN' && (
            <Link href="/dashboard/students/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </Link>
          )}
        </div>
        
        <StudentsTable />
      </div>
    </DashboardShell>
  )
} 