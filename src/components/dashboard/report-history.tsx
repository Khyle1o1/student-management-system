"use client"

import { useState } from "react"
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
  DollarSign
} from "lucide-react"

// Mock data for report history
const reportHistory = [
  {
    id: "rpt_001",
    title: "Monthly Student Enrollment Report",
    type: "students",
    generatedAt: "2025-01-10T10:30:00Z",
    generatedBy: "Admin User",
    size: "1.2 MB",
    status: "completed",
    downloads: 5
  },
  {
    id: "rpt_002",
    title: "Attendance Summary - December 2024",
    type: "attendance",
    generatedAt: "2025-01-08T14:15:00Z",
    generatedBy: "Admin User",
    size: "850 KB",
    status: "completed",
    downloads: 12
  },
  {
    id: "rpt_003",
    title: "Payment Status Report",
    type: "financial",
    generatedAt: "2025-01-05T09:45:00Z",
    generatedBy: "Admin User",
    size: "2.1 MB",
    status: "completed",
    downloads: 8
  },
  {
    id: "rpt_004",
    title: "Event Attendance Analysis",
    type: "attendance",
    generatedAt: "2025-01-03T16:20:00Z",
    generatedBy: "Admin User",
    size: "1.8 MB",
    status: "completed",
    downloads: 3
  },
  {
    id: "rpt_005",
    title: "Revenue Report Q4 2024",
    type: "financial",
    generatedAt: "2024-12-31T11:00:00Z",
    generatedBy: "Admin User",
    size: "950 KB",
    status: "completed",
    downloads: 15
  }
]

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
  const [deletingReport, setDeletingReport] = useState<string | null>(null)

  const filteredReports = reportHistory.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDownloadReport = (reportId: string) => {
    // In a real app, this would trigger the actual download
    console.log(`Downloading report: ${reportId}`)
  }

  const handleRegenerateReport = (reportId: string) => {
    // In a real app, this would trigger report regeneration
    console.log(`Regenerating report: ${reportId}`)
  }

  const handleDeleteReport = async (reportId: string) => {
    setDeletingReport(reportId)
    // Simulate deletion
    await new Promise(resolve => setTimeout(resolve, 1000))
    setDeletingReport(null)
    // In a real app, this would call the API to delete the report
    console.log(`Deleted report: ${reportId}`)
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
            View and manage previously generated reports
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
              />
            </div>
          </div>

          {/* Reports Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No reports found matching your search" : "No reports generated yet"}
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
                        <TableCell>
                          <div className="text-sm">{report.size}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{report.downloads}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDownloadReport(report.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRegenerateReport(report.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteReport(report.id)}
                                className="text-red-600"
                                disabled={deletingReport === report.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingReport === report.id ? "Deleting..." : "Delete"}
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
          {filteredReports.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Reports</p>
                    <p className="text-2xl font-bold text-blue-900">{filteredReports.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Total Downloads</p>
                    <p className="text-2xl font-bold text-green-900">
                      {filteredReports.reduce((sum, report) => sum + report.downloads, 0)}
                    </p>
                  </div>
                  <Download className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Latest Report</p>
                    <p className="text-sm font-bold text-purple-900">
                      {formatDate(filteredReports[0]?.generatedAt || "")}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 