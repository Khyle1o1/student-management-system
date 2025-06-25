import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FeeForm } from "@/components/dashboard/fee-form"

async function getFee(id: string) {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/fees/${id}`, {
    cache: 'no-store'
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      notFound()
    }
    throw new Error('Failed to fetch fee')
  }
  
  return response.json()
}

interface EditFeePageProps {
  params: {
    id: string
  }
}

export default async function EditFeePage({ params }: EditFeePageProps) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const fee = await getFee(params.id)

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Fee</h1>
          <p className="text-muted-foreground">
            Update the fee structure details
          </p>
        </div>
        
        <FeeForm feeId={params.id} initialData={fee} />
      </div>
    </DashboardShell>
  )
} 