import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function ForbiddenPage() {
  return (
    <DashboardShell>
      <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-4xl font-bold text-red-600">403 - Forbidden</h1>
        <p className="text-muted-foreground max-w-md">
          You don&apos;t have permission to access this page with your current account
          level. Please contact your system administrator if you believe this is an error.
        </p>
      </div>
    </DashboardShell>
  )
}


