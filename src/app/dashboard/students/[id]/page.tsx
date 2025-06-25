import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EditStudentForm } from "@/components/dashboard/edit-student-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

async function getStudent(studentId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          }
        }
      }
    })

    if (!student) return null

    // Convert null values to undefined for the form component
    return {
      ...student,
      phoneNumber: student.phoneNumber || undefined,
      address: student.address || undefined
    }
  } catch (error) {
    console.error("Error fetching student:", error)
    return null
  }
}

interface EditStudentPageProps {
  params: {
    id: string
  }
}

export default async function EditStudentPage({ params }: EditStudentPageProps) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const student = await getStudent(params.id)

  if (!student) {
    notFound()
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
              <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
              <p className="text-muted-foreground">
                Update student information for {student.name}
              </p>
            </div>
          </div>
        </div>
        
        <EditStudentForm studentId={params.id} initialData={student} />
      </div>
    </DashboardShell>
  )
} 