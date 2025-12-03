import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { FeeForm } from "@/components/dashboard/fee-form"
import { cookies } from "next/headers"

async function getFee(id: string) {
  const cookieHeader = (await cookies()).toString()
  const baseUrl = process.env.NEXTAUTH_URL

  if (!baseUrl) {
    throw new Error("NEXTAUTH_URL is not configured")
  }

  const response = await fetch(`${baseUrl}/api/fees/${id}`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
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
  params: Promise<{
    id: string
  }>
}

export default async function EditFeePage({ params }: EditFeePageProps) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const { id } = await params
  const fee = await getFee(id)

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Fee</h1>
          <p className="text-muted-foreground">
            Update the fee structure details
          </p>
        </div>
        
        <FeeForm feeId={id} initialData={fee} />
      </div>
    </DashboardShell>
  )
} 