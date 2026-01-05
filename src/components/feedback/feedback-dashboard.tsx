"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { BarChart3, Download, Loader2, Search, Sparkles, ThumbsUp, TriangleAlert } from "lucide-react"
import { format } from "date-fns"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

type FeedbackEntry = {
  id: string
  org_name: string | null
  user_type: string | null
  purpose: string | null
  accessibility: number | null
  responsiveness: number | null
  transparency: number | null
  professionalism: number | null
  helpfulness: number | null
  communication: number | null
  event_quality: number | null
  overall_rating: number | null
  reaction_type: string | null
  comment: string | null
  status: string | null
  created_at: string
  updated_at: string
}

type OrgOption = {
  id: string
  name: string
}

type FeedbackStats = {
  total: number
  averageOverall: number
  categoryAverages: Record<string, number>
  reactionBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
  dailyTrend: Record<string, number>
  orgSummaries: Array<{
    org_name: string | null
    total: number
    average_overall: number
    reactions: Record<string, number>
  }>
}

const REACTION_COLORS: Record<string, string> = {
  positive: "#22c55e",
  negative: "#f97316",
  suggestion: "#38bdf8",
  complaint: "#f59e0b",
  other: "#94a3b8",
}

const ALL_OPTION = "all"

export function FeedbackDashboard() {
  const { data: session } = useSession()
  const { toast } = useToast()

  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [organizations, setOrganizations] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    orgId: ALL_OPTION,
    purpose: ALL_OPTION,
    userType: ALL_OPTION,
    reactionType: ALL_OPTION,
    status: ALL_OPTION,
    minRating: "",
    maxRating: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  })

  const isAdmin = session?.user?.role === "ADMIN"

  const loadOrganizations = async () => {
    if (!isAdmin) return
    try {
      const res = await fetch("/api/feedback/organizations")
      if (!res.ok) throw new Error("Failed to load organizations")
      const data = await res.json()
      setOrganizations(data.organizations || [])
    } catch (error) {
      console.error(error)
      toast({
        title: "Cannot load organizations",
        description: "Organization filter will be hidden until reload.",
      })
    }
  }

  useEffect(() => {
    loadOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const fetchFeedback = async (opts?: { page?: number }) => {
    const nextPage = opts?.page ?? page
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(nextPage))
    params.set("limit", String(limit))
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== ALL_OPTION) params.set(key, value)
    })

    try {
      const res = await fetch(`/api/feedback?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load feedback")
      setFeedback(data.feedback || [])
      setTotal(data.total || 0)
      setPage(data.page || 1)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Unable to load feedback",
        description: error.message || "Please try again shortly.",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setLoadingStats(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== ALL_OPTION) params.set(key, value)
    })
    try {
      const res = await fetch(`/api/feedback/stats?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load stats")
      setStats(data)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Unable to load analytics",
        description: error.message || "Please refresh later.",
      })
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchFeedback({ page: 1 })
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.orgId,
    filters.purpose,
    filters.userType,
    filters.reactionType,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.minRating,
    filters.maxRating,
  ])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Update failed")
      toast({ title: "Status updated" })
      fetchFeedback()
      fetchStats()
    } catch (error: any) {
      toast({ title: "Could not update status", description: error.message })
    }
  }

  const exportCsv = () => {
    const csv = Papa.unparse(
      feedback.map((f) => ({
        Date: format(new Date(f.created_at), "yyyy-MM-dd HH:mm"),
        Organization: f.org_name || "Unknown",
        Purpose: f.purpose,
        UserType: f.user_type,
        Overall: f.overall_rating,
        Reaction: f.reaction_type,
        Status: f.status,
        Comment: f.comment,
      }))
    )
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "organization-feedback.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = () => {
    const sheetData = feedback.map((f) => ({
      Date: format(new Date(f.created_at), "yyyy-MM-dd HH:mm"),
      Organization: f.org_name || "Unknown",
      Purpose: f.purpose,
      UserType: f.user_type,
      Overall: f.overall_rating,
      Reaction: f.reaction_type,
      Status: f.status,
      Comment: f.comment,
    }))
    const ws = XLSX.utils.json_to_sheet(sheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Feedback")
    XLSX.writeFile(wb, "organization-feedback.xlsx")
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    doc.text("Organization Feedback Export", 14, 16)
    let y = 26
    feedback.slice(0, 60).forEach((f, idx) => {
      const line = `${idx + 1}. ${format(new Date(f.created_at), "yyyy-MM-dd")} • ${f.org_name || "Org"} • ${
        f.purpose || "N/A"
      } • Rating: ${f.overall_rating ?? "N/A"} • ${f.reaction_type || ""}`
      doc.text(line, 14, y)
      if (f.comment) {
        const wrapped = doc.splitTextToSize(`"${f.comment}"`, 180)
        doc.text(wrapped, 18, y + 6)
        y += wrapped.length * 6
      }
      y += 10
      if (y > 270) {
        doc.addPage()
        y = 20
      }
    })
    doc.save("organization-feedback.pdf")
  }

  const reactionChartData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.reactionBreakdown || {}).map(([name, value]) => ({
      name,
      value,
    }))
  }, [stats])

  const categoryChartData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.categoryAverages || {}).map(([name, value]) => ({
      name: name.replaceAll("_", " "),
      value,
    }))
  }, [stats])

  const trendData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.dailyTrend || {})
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, value]) => ({ date, value }))
  }, [stats])

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Feedback Center</p>
          <h2 className="text-2xl font-bold">Organization Feedback</h2>
          <p className="text-sm text-muted-foreground">
            Public submissions routed to the correct organization. Admin sees all.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border text-foreground" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" className="border-border text-foreground" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={exportPdf}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Feedback</CardDescription>
            <CardTitle className="text-3xl">
              {loadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.total ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            All time submissions routed by organization
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Average Satisfaction</CardDescription>
            <CardTitle className="text-3xl">
              {loadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.averageOverall?.toFixed(2) ?? "0.00"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            1-5 scale across all categories
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Open Items</CardDescription>
            <CardTitle className="text-3xl">
              {loadingStats ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                stats?.statusBreakdown?.NEW ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            New feedback awaiting acknowledgement
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-muted-foreground">
            Narrow down by organization, type, reaction, status, or date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {isAdmin && (
              <Select
                value={filters.orgId}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, orgId: v }))}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="All organizations" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground max-h-64">
                  <SelectItem value={ALL_OPTION}>All organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={filters.purpose}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, purpose: v }))}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Purpose" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value={ALL_OPTION}>All purposes</SelectItem>
                {["Concern / Complaint", "Suggestion", "Appreciation", "Event Feedback", "Service Feedback", "Other"].map(
                  (item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select
              value={filters.reactionType}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, reactionType: v }))}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Comment type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value={ALL_OPTION}>All types</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v }))}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value={ALL_OPTION}>All status</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <Select
              value={filters.userType}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, userType: v }))}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="User type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value={ALL_OPTION}>All users</SelectItem>
                {["Student", "Parent", "Alumni", "Faculty", "Visitor", "Other"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              max={5}
              step={1}
              value={filters.minRating}
              onChange={(e) => setFilters((prev) => ({ ...prev, minRating: e.target.value }))}
              className="bg-background border-border text-foreground"
              placeholder="Min rating"
            />
            <Input
              type="number"
              min={1}
              max={5}
              step={1}
              value={filters.maxRating}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxRating: e.target.value }))}
              className="bg-background border-border text-foreground"
              placeholder="Max rating"
            />
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="bg-background border-border text-foreground"
              placeholder="From date"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="bg-background border-border text-foreground"
              placeholder="To date"
            />
          </div>
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search comment"
              className="pl-10 bg-background border-border text-foreground"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="text-foreground hover:bg-muted"
              onClick={() => setFilters({
                orgId: ALL_OPTION,
                purpose: ALL_OPTION,
                userType: ALL_OPTION,
                reactionType: ALL_OPTION,
                status: ALL_OPTION,
                minRating: "",
                maxRating: "",
                dateFrom: "",
                dateTo: "",
                search: "",
              })}
            >
              Clear filters
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => fetchFeedback({ page: 1 })}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Ratings by Category</CardTitle>
            <CardDescription className="text-muted-foreground">Average 1–5 per dimension</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fill: "currentColor", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Comment Type Mix</CardTitle>
            <CardDescription className="text-muted-foreground">Positive vs negative vs suggestion</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reactionChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {reactionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={REACTION_COLORS[entry.name] || "#60a5fa"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Daily Trend</CardTitle>
          <CardDescription className="text-muted-foreground">Submissions over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: "currentColor", fontSize: 12 }} />
              <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Feedback List</CardTitle>
            <CardDescription className="text-muted-foreground">View and manage submissions.</CardDescription>
          </div>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {total} entries
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading feedback...
                  </TableCell>
                </TableRow>
              ) : feedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No feedback found for these filters.
                  </TableCell>
                </TableRow>
              ) : (
                feedback.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-foreground">
                      {format(new Date(item.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{item.org_name || "—"}</TableCell>
                    <TableCell className="text-foreground">{item.purpose}</TableCell>
                    <TableCell className="text-foreground">{item.user_type || "—"}</TableCell>
                    <TableCell className="font-semibold">{item.overall_rating ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className="uppercase"
                        style={{ backgroundColor: `${REACTION_COLORS[item.reaction_type || "other"]}30` }}
                      >
                        {item.reaction_type || "other"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "RESOLVED"
                            ? "secondary"
                            : item.status === "ACKNOWLEDGED"
                              ? "outline"
                              : "default"
                        }
                        className={
                          item.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : item.status === "ACKNOWLEDGED"
                              ? "border-amber-200 text-amber-700"
                              : "bg-blue-500/10 text-blue-700"
                        }
                      >
                        {item.status || "NEW"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-border">
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border border-border text-foreground max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Feedback Detail</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                              Submitted {format(new Date(item.created_at), "PPP p")} for {item.org_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                              <div>
                                <p className="text-muted-foreground">Organization</p>
                                <p>{item.org_name || "—"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Purpose</p>
                                <p>{item.purpose}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              {["accessibility","responsiveness","transparency","professionalism","helpfulness","communication","event_quality","overall_rating"].map((key) => (
                                <div key={key} className="bg-muted rounded p-2">
                                  <p className="text-xs text-muted-foreground">{key.replaceAll("_", " ")}</p>
                                  <p className="font-semibold">{(item as any)[key] ?? "—"}</p>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <p className="text-muted-foreground text-sm">Comment</p>
                              <Textarea
                                readOnly
                                value={item.comment || "No additional message."}
                                className="bg-background border-border text-foreground"
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {item.status !== "ACKNOWLEDGED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-700 hover:bg-amber-500/10"
                          onClick={() => handleStatusChange(item.id, "ACKNOWLEDGED")}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {item.status !== "RESOLVED" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => handleStatusChange(item.id, "RESOLVED")}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4 text-muted-foreground">
            <div>
              Page {page} of {Math.max(1, Math.ceil(total / limit))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-border"
                disabled={page === 1}
                onClick={() => {
                  const next = Math.max(1, page - 1)
                  setPage(next)
                  fetchFeedback({ page: next })
                }}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-border"
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  fetchFeedback({ page: next })
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && stats?.orgSummaries?.length ? (
        <Card className="bg-card border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Organization Snapshot</CardTitle>
            <CardDescription className="text-muted-foreground">Quick glance per org</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stats.orgSummaries.map((org) => (
              <div key={org.org_name || "unknown"} className="border border-border rounded-lg p-3 bg-muted">
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">{org.org_name || "Org"}</p>
                  <Badge className="bg-blue-500/10 text-blue-700">{org.total} feedback</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4 text-emerald-500" />
                  Avg {org.average_overall.toFixed(2)}
                </div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 rounded bg-green-500/10 text-green-700">+ {org.reactions?.positive ?? 0}</span>
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-700">⚠ {(org.reactions?.complaint ?? 0) + (org.reactions?.negative ?? 0)}</span>
                  <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-700">💡 {org.reactions?.suggestion ?? 0}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

