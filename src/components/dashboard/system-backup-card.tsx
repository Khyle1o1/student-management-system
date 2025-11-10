"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow, format } from "date-fns"
import { DownloadCloud, RefreshCcw, History, HardDrive } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface BackupInfo {
  name: string
  createdAt: string
  sizeBytes: number
  sizeHuman: string
  metadata?: {
    requestedBy?: {
      name: string | null
    }
    triggeredBy?: "manual" | "automatic"
  }
}

interface BackupSummary {
  total: number
  lastBackupAt: string | null
  nextScheduledBackupAt: string
}

interface BackupStatusResponse {
  backups: BackupInfo[]
  summary: BackupSummary
  status: {
    backupInProgress: boolean
    restoreInProgress: boolean
  }
}

export function SystemBackupCard() {
  const [data, setData] = useState<BackupStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<string | undefined>()
  const selectedBackupRef = useRef<string | undefined>()

  useEffect(() => {
    selectedBackupRef.current = selectedBackup
  }, [selectedBackup])

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/system/backups", {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to load backup information")
      }

      const payload: BackupStatusResponse = await response.json()
      setData(payload)

      const currentSelection = selectedBackupRef.current
      const stillExists = currentSelection
        ? payload.backups.some((backup) => backup.name === currentSelection)
        : false

      if (!currentSelection || !stillExists) {
        const nextSelection = payload.backups[0]?.name
        setSelectedBackup(nextSelection)
      }

      setError(null)
    } catch (err) {
      console.error(err)
      setError("Unable to load backup information. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const handleManualBackup = useCallback(async () => {
    setIsBackingUp(true)
    try {
      const response = await fetch("/api/system/backups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Backup failed")
      }

      toast({
        title: "Backup completed",
        description: `Created ${payload.backup.name} (${payload.backup.sizeHuman}).`,
      })

      await fetchBackups()
    } catch (err) {
      toast({
        title: "Backup failed",
        description:
          err instanceof Error ? err.message : "Unable to complete the backup.",
        variant: "destructive",
      })
    } finally {
      setIsBackingUp(false)
    }
  }, [fetchBackups])

  const handleRestore = useCallback(async () => {
    if (!selectedBackup) {
      toast({
        title: "Select a backup",
        description: "Please choose a backup file to restore.",
        variant: "destructive",
      })
      return
    }

    setIsRestoring(true)
    try {
      const response = await fetch("/api/system/backups/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupName: selectedBackup }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Restore failed")
      }

      toast({
        title: "Restore completed",
        description: `${selectedBackup} restored successfully.`,
      })

      await fetchBackups()
    } catch (err) {
      toast({
        title: "Restore failed",
        description:
          err instanceof Error ? err.message : "Unable to restore the backup.",
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
    }
  }, [fetchBackups, selectedBackup])

  const lastBackupText = useMemo(() => {
    if (!data?.summary.lastBackupAt) {
      return "No backups yet"
    }
    const lastDate = new Date(data.summary.lastBackupAt)
    return `${format(lastDate, "MMMM d, yyyy h:mm a")} (${formatDistanceToNow(lastDate, { addSuffix: true })})`
  }, [data])

  const nextBackupText = useMemo(() => {
    if (!data?.summary.nextScheduledBackupAt) {
      return "Not scheduled"
    }
    const nextDate = new Date(data.summary.nextScheduledBackupAt)
    return `${format(nextDate, "MMMM d, yyyy")}`
  }, [data])

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <HardDrive className="h-6 w-6" />
            System Backup &amp; Restore
          </CardTitle>
          <CardDescription>
            Automatic monthly backups and manual restore controls
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleManualBackup}
            disabled={isBackingUp || data?.status.backupInProgress}
            className="flex items-center gap-2"
          >
            {isBackingUp ? (
              <>
                <RefreshCcw className="h-4 w-4 animate-spin" />
                Backing Up...
              </>
            ) : (
              <>
                <DownloadCloud className="h-4 w-4" />
                Back Up Now
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                disabled={
                  data?.backups.length === 0 ||
                  isRestoring ||
                  data?.status?.restoreInProgress
                }
              >
                <History className="h-4 w-4" />
                Restore
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Restore system from backup</AlertDialogTitle>
                <AlertDialogDescription>
                  Restoring will overwrite all current data and files with the backup contents. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-2">
                {data?.backups.length ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Available backups
                      </label>
                      <Select
                        value={selectedBackup}
                        onValueChange={setSelectedBackup}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a backup file" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.backups.map((backup) => (
                            <SelectItem key={backup.name} value={backup.name}>
                              {backup.name} • {backup.sizeHuman}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      Restoring may take several minutes. Keep this window open until it finishes.
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    No backups available. Create a backup first before restoring.
                  </div>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRestore}
                  disabled={
                    !selectedBackup ||
                    isRestoring ||
                    !data?.backups.length ||
                    data?.status?.restoreInProgress
                  }
                >
                  {isRestoring ? "Restoring..." : "Restore"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-24 rounded-lg border border-muted bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : data ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Last backup"
                value={lastBackupText}
                tone="default"
              />
              <MetricCard
                label="Next scheduled"
                value={nextBackupText}
                tone="info"
              />
              <MetricCard
                label="Total backups"
                value={`${data.summary.total}`}
                tone="muted"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Available backups
                </h3>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {data.status.backupInProgress && (
                    <Badge variant="outline" className="border-blue-400 text-blue-600">
                      <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                      Backup running
                    </Badge>
                  )}
                  {data.status.restoreInProgress && (
                    <Badge variant="outline" className="border-amber-400 text-amber-600">
                      <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                      Restore running
                    </Badge>
                  )}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20">
                {data.backups.length ? (
                  <ScrollArea className="h-64">
                    <ul className="divide-y">
                      {data.backups.map((backup) => {
                        const createdAt = new Date(backup.createdAt)
                        const trigLabel =
                          backup.metadata?.triggeredBy === "automatic"
                            ? "Automatic"
                            : "Manual"

                        return (
                          <li
                            key={backup.name}
                            className={cn(
                              "flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between",
                              selectedBackup === backup.name && "bg-background",
                            )}
                          >
                            <div>
                              <p className="font-medium">{backup.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(createdAt, "MMMM d, yyyy h:mm a")} •{" "}
                                {formatDistanceToNow(createdAt, { addSuffix: true })}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">{backup.sizeHuman}</Badge>
                              {backup.metadata?.requestedBy?.name && (
                                <Badge variant="outline">
                                  {backup.metadata.requestedBy.name}
                                </Badge>
                              )}
                              <Badge variant="outline">{trigLabel}</Badge>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                ) : (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No backups stored yet. Run a manual backup or wait for the automatic schedule.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  label: string
  value: string
  tone: "default" | "info" | "muted"
}

function MetricCard({ label, value, tone }: MetricCardProps) {
  const toneClasses = {
    default: "bg-blue-50 border-blue-100 text-blue-800",
    info: "bg-indigo-50 border-indigo-100 text-indigo-800",
    muted: "bg-slate-50 border-slate-100 text-slate-800",
  }

  return (
    <div className={cn("rounded-lg border p-4", toneClasses[tone])}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  )
}


