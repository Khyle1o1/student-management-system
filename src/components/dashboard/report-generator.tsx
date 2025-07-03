"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  FileText, 
  Calendar, 
  Users, 
  DollarSign, 
  Download,
  Settings,
  Filter,
  RefreshCw
} from "lucide-react"

interface Event {
  id: string
  title: string
  description: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  eventType: string
  status: string
}

const reportTypes = [
  {
    id: "students",
    name: "Student Reports",
    description: "Reports related to student information and enrollment",
    icon: Users,
    templates: [
      { id: "student-list", name: "Student List", description: "Complete student directory" },
      { id: "enrollment-report", name: "Enrollment Report", description: "Student enrollment by year/course" },
      { id: "student-demographics", name: "Demographics", description: "Student demographic breakdown" }
    ]
  },
  {
    id: "attendance",
    name: "Attendance Reports",
    description: "Reports for tracking event attendance",
    icon: Calendar,
    templates: [
      { id: "attendance-summary", name: "Attendance Summary", description: "Overall attendance statistics" },
      { id: "event-attendance", name: "Event Attendance", description: "Attendance by specific events" },
      { id: "student-attendance", name: "Student Attendance", description: "Individual student attendance records" }
    ]
  },
  {
    id: "financial",
    name: "Financial Reports",
    description: "Payment and revenue tracking reports",
    icon: DollarSign,
    templates: [
      { id: "payment-status", name: "Payment Status", description: "Current payment status overview" },
      { id: "revenue-report", name: "Revenue Report", description: "Financial summary and trends" },
      { id: "outstanding-fees", name: "Outstanding Fees", description: "Unpaid fees by student" }
    ]
  }
]

export function ReportGenerator() {
  const [selectedType, setSelectedType] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [reportTitle, setReportTitle] = useState<string>("")
  const [reportDescription, setReportDescription] = useState<string>("")
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" })
  const [filters, setFilters] = useState<{ 
    yearLevel: string; 
    course: string; 
    semester: string;
    eventId: string;
  }>({
    yearLevel: "",
    course: "",
    semester: "",
    eventId: ""
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const selectedReportType = reportTypes.find(type => type.id === selectedType)
  const selectedTemplateData = selectedReportType?.templates.find(template => template.id === selectedTemplate)

  // Fetch events when attendance report type is selected
  useEffect(() => {
    if (selectedType === "attendance") {
      fetchEvents()
    }
  }, [selectedType])

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true)
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    
    try {
      // Build the report parameters
      const reportParams = {
        type: selectedType,
        template: selectedTemplate,
        title: reportTitle,
        description: reportDescription,
        dateRange,
        filters
      }

      // For event-specific attendance reports, use the export functionality
      if (selectedTemplate === "event-attendance" && filters.eventId) {
        const response = await fetch(`/api/attendance/event/${filters.eventId}/export`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = url
          
          const selectedEvent = events.find(e => e.id === filters.eventId)
          a.download = `attendance-report-${selectedEvent?.title || 'event'}-${new Date().toISOString().split('T')[0]}.csv`
          
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        // For other report types, simulate report generation
        await new Promise(resolve => setTimeout(resolve, 3000))
        console.log("Generated report with data:", reportParams)
      }
    } catch (error) {
      console.error("Error generating report:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isFormValid = selectedType && selectedTemplate && reportTitle.trim()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Custom Report Generator</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create detailed reports with custom parameters and filters
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Report Type</Label>
            <div className="grid gap-4 md:grid-cols-3">
              {reportTypes.map((type) => {
                const Icon = type.icon
                return (
                  <div
                    key={type.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedType === type.id 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedType(type.id)
                      setSelectedTemplate("")
                      setFilters({
                        yearLevel: "",
                        course: "",
                        semester: "",
                        eventId: ""
                      })
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-md ${
                        selectedType === type.id ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          selectedType === type.id ? "text-blue-600" : "text-gray-600"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{type.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Template Selection */}
          {selectedReportType && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Report Template</Label>
              <div className="grid gap-3">
                {selectedReportType.templates.map((template) => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedTemplate === template.id 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                      {selectedTemplate === template.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Details */}
          {selectedTemplate && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Report Details</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reportTitle">Report Title *</Label>
                  <Input
                    id="reportTitle"
                    placeholder={`${selectedTemplateData?.name} - ${new Date().toLocaleDateString()}`}
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select value={filters.semester} onValueChange={(value) => setFilters({...filters, semester: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      <SelectItem value="fall-2024">Fall 2024</SelectItem>
                      <SelectItem value="spring-2025">Spring 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reportDescription">Description (Optional)</Label>
                <Textarea
                  id="reportDescription"
                  placeholder="Brief description of the report purpose..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Filters */}
          {selectedTemplate && (
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </Label>
              
              {/* Event Selection for Attendance Reports */}
              {selectedType === "attendance" && selectedTemplate === "event-attendance" && (
                <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label htmlFor="eventSelect" className="text-sm font-medium text-blue-900">
                    Select Specific Event *
                  </Label>
                  <div className="flex space-x-2">
                    <Select 
                      value={filters.eventId} 
                      onValueChange={(value) => setFilters({...filters, eventId: value})}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={loadingEvents ? "Loading events..." : "Choose an event"} />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{event.title}</span>
                              <span className="text-sm text-gray-600">
                                {formatEventDate(event.eventDate)} • {event.eventType} • {event.status}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchEvents}
                      disabled={loadingEvents}
                    >
                      {loadingEvents ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {filters.eventId && (
                    <div className="mt-2 p-2 bg-white border border-blue-200 rounded text-sm">
                      <strong>Selected Event:</strong> {events.find(e => e.id === filters.eventId)?.title}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearLevel">Year Level</Label>
                  <Select value={filters.yearLevel} onValueChange={(value) => setFilters({...filters, yearLevel: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All year levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Year Levels</SelectItem>
                      <SelectItem value="first">First Year</SelectItem>
                      <SelectItem value="second">Second Year</SelectItem>
                      <SelectItem value="third">Third Year</SelectItem>
                      <SelectItem value="fourth">Fourth Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          {isFormValid && (
            <div className="pt-4 border-t">
              <div className="flex flex-col space-y-2">
                {selectedTemplate === "event-attendance" && !filters.eventId && (
                  <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    Please select an event to generate the attendance report.
                  </div>
                )}
                
                <Button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating || (selectedTemplate === "event-attendance" && !filters.eventId)}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {selectedTemplate === "event-attendance" ? "Generating PDF..." : "Generating Report..."}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {selectedTemplate === "event-attendance" ? "Download PDF Report" : "Generate Report"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 