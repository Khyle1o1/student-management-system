"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Search, Mail, AlertCircle, CheckCircle, Clock, RotateCw } from "lucide-react"
import { format } from "date-fns"

interface NotificationLog {
  id: string
  recipient_email: string
  recipient_name: string
  subject: string
  notification_type: string
  status: 'sent' | 'failed' | 'pending' | 'retrying'
  message_id?: string
  error_message?: string
  sent_at?: string
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: '',
  })
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const { page, limit } = pagination
  const { type, status, search } = filters

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type && type !== 'all' && { type }),
        ...(status && status !== 'all' && { status }),
        ...(search && { search }),
      })

      const response = await fetch(`/api/notifications/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }, [page, limit, type, status, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRetry = async (logId: string) => {
    try {
      setRetryingId(logId)
      const response = await fetch(`/api/notifications/retry/${logId}`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh logs
        fetchLogs()
      }
    } catch (error) {
      console.error('Error retrying notification:', error)
    } finally {
      setRetryingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { label: 'Sent', variant: 'default', icon: CheckCircle, className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      failed: { label: 'Failed', variant: 'destructive', icon: AlertCircle, className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      pending: { label: 'Pending', variant: 'secondary', icon: Clock, className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      retrying: { label: 'Retrying', variant: 'secondary', icon: RotateCw, className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      event_1day: 'Event (1 Day)',
      event_1hour: 'Event (1 Hour)',
      fee_assigned: 'Fee Assigned',
      fee_3days: 'Fee Due (3 Days)',
      certificate: 'Certificate',
    }

    return (
      <Badge variant="outline">
        {typeLabels[type] || type}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Logs</h1>
        <p className="text-muted-foreground mt-2">
          View all sent email notifications and their delivery status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter notifications by type, status, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={filters.type}
                onValueChange={(value) => {
                  setFilters({ ...filters, type: value })
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="event_1day">Event (1 Day)</SelectItem>
                  <SelectItem value="event_1hour">Event (1 Hour)</SelectItem>
                  <SelectItem value="fee_assigned">Fee Assigned</SelectItem>
                  <SelectItem value="fee_3days">Fee Due (3 Days)</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value })
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Email or subject..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
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
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                Total: {pagination.total} notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell colSpan={6} className="text-center py-8">
                      <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No notifications found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.recipient_name}</div>
                          <div className="text-sm text-muted-foreground">{log.recipient_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{log.subject}</div>
                        {log.error_message && (
                          <div className="text-sm text-red-600 mt-1 max-w-xs truncate" title={log.error_message}>
                            Error: {log.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(log.notification_type)}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.sent_at
                            ? format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')
                            : format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingId === log.id}
                          >
                            {retryingId === log.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCw className="h-4 w-4 mr-1" />
                                Retry
                              </>
                            )}
                          </Button>
                        )}
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
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
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

