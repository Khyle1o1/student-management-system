"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Download, 
  MoreHorizontal, 
  RefreshCw, 
  Trash2,
  Calendar,
  FileText,
  Users,
  DollarSign,
  Loader2
} from "lucide-react"

interface Report {
  id: string
  title: string
  type: string
  generatedAt: string
  generatedBy: string
  downloadUrl: string
  metadata?: any
}

interface ReportHistoryData {
  reports: Report[]
  summary: {
    total: number
    byType: {
      attendance: number
      financial: number
      students: number
    }
    latestDate: string
  }
}

const getReportIcon = (type: string) => {
  switch (type) {
    case "students":
      return Users
    case "attendance":
      return Calendar
    case "financial":
      return DollarSign
    default:
      return FileText
  }
}

const getReportTypeColor = (type: string) => {
  switch (type) {
    case "students":
      return "bg-blue-100 text-blue-800"
    case "attendance":
      return "bg-green-100 text-green-800"
    case "financial":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function ReportHistory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [reportData, setReportData] = useState<ReportHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  // Fetch report history
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/reports/history')
        if (response.ok) {
          const data = await response.json()
          setReportData(data)
        } else {
          console.error('Failed to fetch report history')
        }
      } catch (error) {
        console.error('Error fetching report history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const filteredReports = reportData?.reports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.type.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleDownloadReport = async (report: Report) => {
    setDownloading(report.id)
    try {
      const response = await fetch(report.downloadUrl)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        // Extract filename from report title
        const filename = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Failed to download report')
      }
    } catch (error) {
      console.error('Error downloading report:', error)
    } finally {
      setDownloading(null)
    }
  }

  const handleRegenerateReport = async (report: Report) => {
    // Trigger download which regenerates the report
    await handleDownloadReport(report)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Available reports based on your events and fees
          </p>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            {!loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading reports...</span>
            </div>
          ) : (
            <>
              {/* Reports Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "No reports found matching your search" : "No reports available"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReports.map((report) => {
                        const Icon = getReportIcon(report.type)
                        return (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="bg-gray-100 p-2 rounded-md">
                                  <Icon className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{report.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Generated by {report.generatedBy}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={`${getReportTypeColor(report.type)} border-0`}
                              >
                                {report.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatDate(report.generatedAt)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0"
                                    disabled={downloading === report.id}
                                  >
                                    {downloading === report.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDownloadReport(report)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Generate & Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRegenerateReport(report)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regenerate
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Stats */}
              {filteredReports.length > 0 && reportData && (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Available Reports</p>
                        <p className="text-2xl font-bold text-blue-900">{reportData.summary.total}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Attendance Reports</p>
                        <p className="text-2xl font-bold text-green-900">
                          {reportData.summary.byType.attendance}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">Financial Reports</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {reportData.summary.byType.financial}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 