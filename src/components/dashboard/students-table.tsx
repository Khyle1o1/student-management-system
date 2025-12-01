"use client"

import { useState, useEffect, useCallback } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  MoreHorizontal, 
  Edit, 
  Archive, 
  ArchiveRestore,
  Mail, 
  Phone,
  User,
  RefreshCw,
  Download,
  Save,
  Loader2,
  Plus,
  Eye
} from "lucide-react"
import Link from "next/link"
import { StudentDetailsModal } from "./student-details-modal"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

interface Student {
  id: string
  studentId: string
  name: string
  email: string
  yearLevel: string
  course: string
  college: string
  enrolledAt: string
  archived?: boolean
  archivedAt?: string
  user: {
    id: string
    email: string
    role: string
  }
}

export function StudentsTable() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active")
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [pageSize] = useState(20) // Fixed page size
  
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search changes
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        filter: filter,
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })
      
      const response = await fetch(`/api/students?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students)
        setTotalPages(data.pagination.totalPages)
        setTotalCount(data.pagination.totalCount)
        setHasNext(data.pagination.hasNext)
        setHasPrevious(data.pagination.hasPrevious)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearchTerm, pageSize, filter])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleArchiveStudent = async (student: Student) => {
    const wasArchived = !!student.archived

    // SweetAlert confirmation dialog
    const result = await Swal.fire({
      title: wasArchived ? "Unarchive this student?" : "Archive this student?",
      text: wasArchived
        ? `Are you sure you want to unarchive ${student.name}? They will be restored to the active students list.`
        : `Are you sure you want to archive ${student.name}? They will be hidden from the active students list and automatically deleted after 2 years.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: wasArchived ? "Unarchive" : "Archive",
      confirmButtonColor: wasArchived ? "#0f172a" : "#dc2626",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/students/${student.id}/archive`, {
        method: "POST",
      })

      if (response.ok) {
        await fetchStudents() // Refresh the current page

        await Swal.fire({
          icon: "success",
          title: wasArchived ? "Student unarchived" : "Student archived",
          text: wasArchived
            ? "The student has been restored to the active list."
            : "The student has been moved to the archived list.",
          confirmButtonColor: "#0f172a",
        })
      } else {
        Swal.fire({
          icon: "error",
          title: "Unable to update student status",
          text: "An error occurred while archiving/unarchiving the student.",
          confirmButtonColor: "#dc2626",
        })
      }
    } catch (error) {
      console.error("Error archiving student:", error)
      Swal.fire({
        icon: "error",
        title: "Unexpected error",
        text: "An error occurred while archiving/unarchiving the student.",
        confirmButtonColor: "#dc2626",
      })
    }
  }

  const openDetailsModal = (studentId: string) => {
    setSelectedStudentId(studentId)
    setShowDetailsModal(true)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const getYearLevelBadgeColor = (yearLevel: string) => {
    switch (yearLevel) {
      case "YEAR_1": return "bg-green-100 text-green-800"
      case "YEAR_2": return "bg-blue-100 text-blue-800"
      case "YEAR_3": return "bg-yellow-100 text-yellow-800"
      case "YEAR_4": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getYearLevelDisplayText = (yearLevel: string) => {
    switch (yearLevel) {
      case "YEAR_1": return "1st Year"
      case "YEAR_2": return "2nd Year"
      case "YEAR_3": return "3rd Year"
      case "YEAR_4": return "4th Year"
      default: return "Unknown"
    }
  }


  if (loading && students.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading students...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[250px] md:w-[300px]"
          />
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Students</SelectItem>
                <SelectItem value="archived">Archived Students</SelectItem>
                <SelectItem value="all">All Students</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchStudents} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <StudentDetailsModal
        studentId={selectedStudentId}
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedStudentId(null)
        }}
      />

      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">Students</CardTitle>
            {filter === 'archived' && (
              <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs sm:text-sm w-fit">
                Archived students deleted after 2 years
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {/* Desktop Table View - Hidden on Mobile */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Year Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading students...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {searchTerm 
                            ? "No students found matching your search." 
                            : filter === 'archived' 
                              ? "No archived students found."
                              : "No students found."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.studentId}
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => openDetailsModal(student.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                        >
                          {student.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{student.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{student.college}</TableCell>
                      <TableCell className="font-medium">{student.course}</TableCell>
                      <TableCell>
                        <Badge className={getYearLevelBadgeColor(student.yearLevel)}>
                          {getYearLevelDisplayText(student.yearLevel)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.archived ? (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(student.enrolledAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDetailsModal(student.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/students/${student.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleArchiveStudent(student)}
                              className={student.archived ? "text-green-600" : "text-orange-600"}
                            >
                              {student.archived ? (
                                <>
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Unarchive
                                </>
                              ) : (
                                <>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View - Hidden on Desktop */}
          <div className="md:hidden space-y-3">
            {loading && students.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Loading students...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <User className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground text-center">
                  {searchTerm 
                    ? "No students found matching your search." 
                    : filter === 'archived' 
                      ? "No archived students found."
                      : "No students found."}
                </span>
              </div>
            ) : (
              students.map((student) => (
                <Card key={student.id} className="overflow-hidden border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openDetailsModal(student.id)}
                          className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors line-clamp-1"
                        >
                          {student.name}
                        </button>
                        <p className="text-xs text-muted-foreground mt-0.5">ID: {student.studentId}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 flex-shrink-0 touch-manipulation">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDetailsModal(student.id)}>
                            <Eye className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/students/${student.id}`} className="flex items-center">
                              <Edit className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate">Edit</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleArchiveStudent(student)}
                            className={student.archived ? "text-green-600" : "text-orange-600"}
                          >
                            {student.archived ? (
                              <>
                                <ArchiveRestore className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Unarchive</span>
                              </>
                            ) : (
                              <>
                                <Archive className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Archive</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start space-x-2 text-xs">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="break-words flex-1">{student.email}</span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">College:</span>
                          <span className="font-medium text-right line-clamp-1">{student.college}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Course:</span>
                          <span className="font-medium text-right line-clamp-1">{student.course}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Year Level:</span>
                          <Badge className={`${getYearLevelBadgeColor(student.yearLevel)} text-xs`}>
                            {getYearLevelDisplayText(student.yearLevel)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Enrolled: {formatDate(student.enrolledAt)}
                        </span>
                        {student.archived ? (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 mt-3 border-t">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} student(s)
            </div>
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevious || loading}
                className="text-xs sm:text-sm"
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {/* Show page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNext || loading}
                className="text-xs sm:text-sm"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 