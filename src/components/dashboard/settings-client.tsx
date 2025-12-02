"use client"

import { useContext, useState, useEffect } from "react"
import { SystemSettingsContext } from "@/components/dashboard/dashboard-shell"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { BatchStudentImport } from "@/components/dashboard/batch-student-import"
import { SystemBackupCard } from "@/components/dashboard/system-backup-card"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

export function SettingsClient() {
  const systemSettings = useContext(SystemSettingsContext)
  const [deletionLock, setDeletionLock] = useState<boolean>(!!systemSettings?.deletion_lock)
  const [saving, setSaving] = useState(false)
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (systemSettings) {
      setDeletionLock(!!systemSettings.deletion_lock)
    }
  }, [systemSettings])

  const handleToggle = async (value: boolean) => {
    const previous = deletionLock

    // If turning OFF, prompt for password
    let passwordToSend: string | undefined = undefined
    if (previous === true && value === false) {
      const { value: enteredPassword } = await Swal.fire({
        title: "Disable Deletion Lock Mode?",
        text: "Enter the master password to allow deletions again.",
        input: "password",
        inputPlaceholder: "Enter password",
        inputAttributes: {
          autocapitalize: "off",
          autocorrect: "off",
        },
        showCancelButton: true,
        confirmButtonText: "Confirm",
        confirmButtonColor: "#0f172a",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      })

      if (!enteredPassword) {
        // Cancel toggle if no password entered
        return
      }

      passwordToSend = enteredPassword
    }

    setDeletionLock(value)
    setSaving(true)
    try {
      const response = await fetch("/api/system-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deletion_lock: value,
          ...(passwordToSend ? { password: passwordToSend } : {}),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setDeletionLock(previous)
        await Swal.fire({
          icon: "error",
          title: "Failed to update setting",
          text: data.error || "Something went wrong while updating Deletion Lock Mode.",
          confirmButtonColor: "#dc2626",
        })
        return
      }

      await Swal.fire({
        icon: "success",
        title: value ? "Deletion Lock Mode enabled" : "Deletion Lock Mode disabled",
        text: value
          ? "The system is now in non-destructive mode. All delete actions are blocked."
          : "Delete actions are now allowed again across the system.",
        confirmButtonColor: "#0f172a",
      })
    } catch (error) {
      console.error("Failed to update system settings:", error)
      setDeletionLock(previous)
      await Swal.fire({
        icon: "error",
        title: "Network error",
        text: "Could not update Deletion Lock Mode. Please try again.",
        confirmButtonColor: "#dc2626",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage system settings and bulk operations
          </p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 flex items-start justify-between">
          <div className="space-y-1">
            <Label htmlFor="deletion-lock-toggle" className="text-base font-medium">
              Deletion Lock Mode (No Delete Mode)
            </Label>
            <p className="text-sm text-muted-foreground max-w-xl">
              When enabled, no data in the system can be deleted. All delete actions will be blocked.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Switch
              id="deletion-lock-toggle"
              checked={deletionLock}
              onCheckedChange={handleToggle}
            />
            {saving && (
              <span className="text-xs text-muted-foreground">
                Saving...
              </span>
            )}
          </div>
        </Card>

        <SystemBackupCard />
        <BatchStudentImport />
      </div>
    </div>
  )
}


