"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Activity, Calendar as CalendarIcon, RefreshCw, Search } from "lucide-react"

interface ActivityLog {
  id: string
  user_id: string | null
  user_name: string | null
  role: string
  action: string
  module: string
  target_type: string | null
  target_name: string | null
  college: string | null
  course: string | null
  details: any
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function ActivityLogsPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    action: "all",
    module: "all",
    search: "",
  })

  const { page, limit } = pagination
  const { startDate, endDate, action, module, search } = filters

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(action && action !== "all" && { action }),
        ...(module && module !== "all" && { module }),
        ...(search && { search }),
      })

      const response = await fetch(`/api/activity-logs?${params.toString()}`)
      if (!response.ok) {
        setLogs([])
        setPagination((prev) => ({
          ...prev,
          total: 0,
          totalPages: 0,
        }))
        return
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setPagination(data.pagination || { page, limit, total: 0, totalPages: 0 })
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    } finally {
      setLoading(false)
    }
  }, [page, limit, startDate, endDate, action, module, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const canSeeScopeFilters =
    session?.user.role === "ADMIN" || session?.user.role === "COLLEGE_ORG"

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "default"
      case "COLLEGE_ORG":
        return "secondary"
      case "COURSE_ORG":
        return "outline"
      default:
        return "outline"
    }
  }

  const getModuleBadgeVariant = (module: string) => {
    switch (module) {
      case "events":
        return "default"
      case "fees":
        return "secondary"
      case "attendance":
        return "outline"
      case "certificates":
        return "outline"
      case "evaluations":
        return "outline"
      case "users":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          Activity Timeline
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View a chronological log of important actions across the system. Newest events appear first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value })
                  setPagination({ ...pagination, page: 1 })
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value })
                  setPagination({ ...pagination, page: 1 })
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action type</label>
              <Select
                value={action}
                onValueChange={(value) => {
                  setFilters({ ...filters, action: value })
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="EVENT_CREATED">Event created</SelectItem>
                  <SelectItem value="EVENT_UPDATED">Event updated</SelectItem>
                  <SelectItem value="EVENT_DELETED">Event deleted</SelectItem>
                  <SelectItem value="PAYMENT_APPROVED">Payment approved</SelectItem>
                  <SelectItem value="PAYMENT_REJECTED">Payment rejected</SelectItem>
                  <SelectItem value="CERTIFICATE_ISSUED">Certificate issued</SelectItem>
                  <SelectItem value="USER_CREATED">User created</SelectItem>
                  <SelectItem value="USER_UPDATED">User updated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Module</label>
              <Select
                value={module}
                onValueChange={(value) => {
                  setFilters({ ...filters, module: value })
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="fees">Fees</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="certificates">Certificates</SelectItem>
                  <SelectItem value="evaluations">Evaluations</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-4">
            {canSeeScopeFilters && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">College</label>
                  <Input
                    placeholder="Filter by college"
                    value={filters["college" as keyof typeof filters] as string | undefined || ""}
                    onChange={(e) => {
                      setFilters({ ...filters, college: e.target.value } as any)
                      setPagination({ ...pagination, page: 1 })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course</label>
                  <Input
                    placeholder="Filter by course"
                    value={filters["course" as keyof typeof filters] as string | undefined || ""}
                    onChange={(e) => {
                      setFilters({ ...filters, course: e.target.value } as any)
                      setPagination({ ...pagination, page: 1 })
                    }}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="User, target, or type..."
                  value={search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPagination({ ...pagination, page: 1 })
                      fetchLogs()
                    }
                  }}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Activity History{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({pagination.total} total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No activity logs found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {log.user_name || "System"}
                          </span>
                          {log.user_id && (
                            <span className="text-xs text-muted-foreground">
                              User ID: {log.user_id}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(log.role)}>
                          {log.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {log.action}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Module:{" "}
                            <Badge
                              variant={getModuleBadgeVariant(log.module)}
                              className="ml-1"
                            >
                              {log.module}
                            </Badge>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {log.target_name || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.target_type || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="text-muted-foreground">
                            {log.college || "—"}
                          </span>
                          <span className="text-muted-foreground">
                            {log.course || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages || 1}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={
                    pagination.page === pagination.totalPages ||
                    pagination.totalPages === 0
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


