"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  Users, 
  Calendar, 
  DollarSign, 
  Download, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle
} from "lucide-react"
import { ReportGenerator } from "./report-generator"
import { ReportHistory } from "./report-history"

// Mock data for report stats
const reportStats = {
  totalStudents: 248,
  activeEvents: 12,
  completedPayments: 186,
  pendingPayments: 18,
  attendanceRate: 87.5,
  revenueThisMonth: 24500
}

const quickReports = [
  {
    id: "student-list",
    title: "Student List",
    description: "Complete list of all enrolled students",
    icon: Users,
    type: "students",
    estimatedTime: "2 min"
  },
  {
    id: "attendance-summary",
    title: "Attendance Summary",
    description: "Monthly attendance overview by event",
    icon: Calendar,
    type: "attendance",
    estimatedTime: "3 min"
  },
  {
    id: "payment-status",
    title: "Payment Status",
    description: "Current payment status for all students",
    icon: DollarSign,
    type: "payments",
    estimatedTime: "2 min"
  },
  {
    id: "financial-summary",
    title: "Financial Summary",
    description: "Revenue and payment analytics",
    icon: BarChart3,
    type: "financial",
    estimatedTime: "4 min"
  }
]

export function ReportsManagement() {
  const [activeTab, setActiveTab] = useState("overview")
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)

  const handleGenerateQuickReport = async (reportId: string) => {
    setGeneratingReport(reportId)
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setGeneratingReport(null)
    // In a real app, this would trigger the actual report generation
    console.log(`Generated report: ${reportId}`)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats.activeEvents}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +3 new this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  -2.1% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportStats.revenueThisMonth.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +8% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reports</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate commonly used reports with one click
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {quickReports.map((report) => {
                  const Icon = report.icon
                  const isGenerating = generatingReport === report.id
                  
                  return (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-md">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-medium">{report.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {report.description}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              {report.estimatedTime}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {report.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <Button 
                        onClick={() => handleGenerateQuickReport(report.id)}
                        disabled={isGenerating}
                        className="w-full"
                        size="sm"
                      >
                        {isGenerating ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Generate Report
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <ReportGenerator />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ReportHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
} 