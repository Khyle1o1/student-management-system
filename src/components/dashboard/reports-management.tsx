"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  Users, 
  Calendar, 
  CreditCard, 
  Download, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Loader2
} from "lucide-react"
import { ReportHistory } from "./report-history"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COLLEGES, getCoursesByCollege } from "@/lib/constants/academic-programs"

interface OverviewStats {
  totalStudents: {
    value: number
    change: number
    label: string
  }
  activeEvents: {
    value: number
    change: number
    label: string
  }
  attendanceRate: {
    value: number
    change: number
    label: string
  }
  monthlyRevenue: {
    value: number
    change: number
    label: string
  }
}

const quickReports = [
  {
    id: "events-summary",
    title: "Event Summary Report",
    description: "Overview of attendance per event",
    icon: Calendar,
    type: "events",
    estimatedTime: "3 min"
  },
  {
    id: "fees-summary",
    title: "Fees Summary Report",
    description: "Summary of fees and payments",
    icon: CreditCard,
    type: "fees",
    estimatedTime: "3 min"
  }
]

export function ReportsManagement() {
  const [activeTab, setActiveTab] = useState("overview")
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  
  // Filter states for reports
  const [eventFilters, setEventFilters] = useState({
    college: "all",
    course: "all"
  })
  const [feeFilters, setFeeFilters] = useState({
    college: "all",
    course: "all"
  })

  // Fetch overview statistics
  useEffect(() => {
    const fetchOverviewStats = async () => {
      try {
        setLoadingStats(true)
        const response = await fetch('/api/reports/overview')
        if (response.ok) {
          const data = await response.json()
          setOverviewStats(data)
        } else {
          console.error('Failed to fetch overview stats')
        }
      } catch (error) {
        console.error('Error fetching overview stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchOverviewStats()
  }, [])

  const handleGenerateQuickReport = async (reportId: string) => {
    setGeneratingReport(reportId)
    
    try {
      if (reportId === 'events-summary') {
        // Build query parameters for filters
        const params = new URLSearchParams()
        if (eventFilters.college && eventFilters.college !== 'all') params.append('college', eventFilters.college)
        if (eventFilters.course && eventFilters.course !== 'all') params.append('course', eventFilters.course)
        
        const queryString = params.toString()
        const url = `/api/reports/events-summary/pdf${queryString ? `?${queryString}` : ''}`
        
        // Generate Events Summary Report PDF with filters
        const response = await fetch(url)
        if (response.ok) {
          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = blobUrl
          const filterValue = eventFilters.college !== 'all' ? eventFilters.college : (eventFilters.course !== 'all' ? eventFilters.course : null)
          const filterSuffix = filterValue 
            ? `-${filterValue}`.replace(/\s+/g, '-').toLowerCase()
            : ''
          a.download = `event-summary-report${filterSuffix}-${new Date().toISOString().split('T')[0]}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(blobUrl)
          document.body.removeChild(a)
        } else {
          console.error('Failed to generate events summary report')
        }
      } else if (reportId === 'fees-summary') {
        // Build query parameters for filters
        const params = new URLSearchParams()
        if (feeFilters.college && feeFilters.college !== 'all') params.append('college', feeFilters.college)
        if (feeFilters.course && feeFilters.course !== 'all') params.append('course', feeFilters.course)
        
        const queryString = params.toString()
        const url = `/api/reports/fees-summary/pdf${queryString ? `?${queryString}` : ''}`
        
        // Generate Fees Summary Report PDF with filters
        const response = await fetch(url)
        if (response.ok) {
          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = blobUrl
          const filterValue = feeFilters.college !== 'all' ? feeFilters.college : (feeFilters.course !== 'all' ? feeFilters.course : null)
          const filterSuffix = filterValue 
            ? `-${filterValue}`.replace(/\s+/g, '-').toLowerCase()
            : ''
          a.download = `fees-summary-report${filterSuffix}-${new Date().toISOString().split('T')[0]}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(blobUrl)
          document.body.removeChild(a)
        } else {
          console.error('Failed to generate fees summary report')
        }
      } else {
        // Simulate report generation for other reports
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log(`Generated report: ${reportId}`)
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setGeneratingReport(null)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Students */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{overviewStats?.totalStudents.value || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {overviewStats && overviewStats.totalStudents.change >= 0 ? (
                        <TrendingUp className="inline h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-3 w-3 mr-1" />
                      )}
                      {overviewStats && Math.abs(overviewStats.totalStudents.change) > 0 
                        ? `${overviewStats.totalStudents.change > 0 ? '+' : ''}${overviewStats.totalStudents.change}% ${overviewStats.totalStudents.label}`
                        : overviewStats?.totalStudents.label || 'from last month'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Active Events */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{overviewStats?.activeEvents.value || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {overviewStats && overviewStats.activeEvents.change > 0 ? (
                        <>
                          <TrendingUp className="inline h-3 w-3 mr-1" />
                          +{overviewStats.activeEvents.change} {overviewStats.activeEvents.label}
                        </>
                      ) : (
                        overviewStats?.activeEvents.label || 'upcoming'
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Attendance Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{overviewStats?.attendanceRate.value || 0}%</div>
                    <p className="text-xs text-muted-foreground">
                      {overviewStats && overviewStats.attendanceRate.change >= 0 ? (
                        <TrendingUp className="inline h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-3 w-3 mr-1" />
                      )}
                      {overviewStats && overviewStats.attendanceRate.change !== 0 
                        ? `${overviewStats.attendanceRate.change > 0 ? '+' : ''}${overviewStats.attendanceRate.change}% ${overviewStats.attendanceRate.label}`
                        : overviewStats?.attendanceRate.label || 'from last month'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Monthly Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">₱{(overviewStats?.monthlyRevenue.value || 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {overviewStats && overviewStats.monthlyRevenue.change >= 0 ? (
                        <TrendingUp className="inline h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-3 w-3 mr-1" />
                      )}
                      {overviewStats && overviewStats.monthlyRevenue.change !== 0 
                        ? `${overviewStats.monthlyRevenue.change > 0 ? '+' : ''}${overviewStats.monthlyRevenue.change}% ${overviewStats.monthlyRevenue.label}`
                        : overviewStats?.monthlyRevenue.label || 'from last month'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reports</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate commonly used reports with optional filters
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {quickReports.map((report) => {
                  const Icon = report.icon
                  const isGenerating = generatingReport === report.id
                  const isEventReport = report.id === 'events-summary'
                  const isFeeReport = report.id === 'fees-summary'
                  const currentFilters = isEventReport ? eventFilters : feeFilters
                  const setFilters = isEventReport ? setEventFilters : setFeeFilters
                  const availableCourses = currentFilters.college && currentFilters.college !== 'all'
                    ? getCoursesByCollege(currentFilters.college) 
                    : []
                  
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
                      
                      {/* Filter Options */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700">Filter Options (Optional)</p>
                        
                        {/* College Filter */}
                        <Select
                          value={currentFilters.college}
                          onValueChange={(value) => {
                            setFilters({
                              college: value,
                              course: "all" // Reset course when college changes
                            })
                          }}
                        >
                          <SelectTrigger className="w-full h-9 text-sm">
                            <SelectValue placeholder="All Colleges" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Colleges</SelectItem>
                            {COLLEGES.map((college) => (
                              <SelectItem key={college} value={college}>
                                {college}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Course Filter */}
                        <Select
                          value={currentFilters.course}
                          onValueChange={(value) => {
                            setFilters({
                              ...currentFilters,
                              course: value
                            })
                          }}
                          disabled={!currentFilters.college || currentFilters.college === 'all'}
                        >
                          <SelectTrigger className="w-full h-9 text-sm">
                            <SelectValue placeholder={currentFilters.college && currentFilters.college !== 'all' ? "All Courses" : "Select college first"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {availableCourses.map((course) => (
                              <SelectItem key={course} value={course}>
                                {course}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Clear Filters */}
                        {(currentFilters.college !== 'all' || currentFilters.course !== 'all') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => setFilters({ college: "all", course: "all" })}
                          >
                            Clear Filters
                          </Button>
                        )}
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

        <TabsContent value="history" className="space-y-6">
          <ReportHistory />
        </TabsContent>
      </Tabs>
      
      {/* Footer */}
      <div className="border-t border-gray-200/60 p-3 mt-8">
        <div className="text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
            Made with 
            ❤️
            by Khyle Amacna of 
            AOG Tech
          </p>
        </div>
      </div>
    </div>
  )
} 