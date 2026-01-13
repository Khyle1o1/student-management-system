import { Wrench, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export const metadata = {
  title: "System Maintenance",
  description: "The system is currently under maintenance",
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
            <div className="relative bg-orange-100 dark:bg-orange-900/30 p-6 rounded-full">
              <Wrench className="h-16 w-16 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            System Maintenance
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            We&apos;re currently performing scheduled maintenance to improve your experience.
          </p>
        </div>

        <Alert className="text-left bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            The system is temporarily unavailable. Our team is working to restore access as quickly as possible.
            Please check back shortly.
          </AlertDescription>
        </Alert>

        <div className="pt-4 space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Need immediate assistance?
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Contact your system administrator for more information.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Student Management System
          </p>
        </div>
      </Card>
    </div>
  )
}
