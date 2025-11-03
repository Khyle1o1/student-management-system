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
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { StudentDetailsModal } from "./student-details-modal"

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
  
  // Modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
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

  const handleArchiveStudent = async () => {
    if (!selectedStudent) return

    try {
      const response = await fetch(`/api/students/${selectedStudent.id}/archive`, {
        method: "POST",
      })

      if (response.ok) {
        await fetchStudents() // Refresh the current page
        setShowArchiveModal(false)
        setSelectedStudent(null)
      } else {
        alert("Error archiving student")
      }
    } catch (error) {
      console.error("Error archiving student:", error)
      alert("Error archiving student")
    }
  }

  const openArchiveModal = (student: Student) => {
    setSelectedStudent(student)
    setShowArchiveModal(true)
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Students</SelectItem>
              <SelectItem value="archived">Archived Students</SelectItem>
              <SelectItem value="all">All Students</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStudents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href="/dashboard/students/new">
              <Plus className="h-4 w-4 mr-2" />
              Add New Student
            </Link>
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showArchiveModal}
        onClose={() => {
          setShowArchiveModal(false)
          setSelectedStudent(null)
        }}
        onConfirm={handleArchiveStudent}
        title={selectedStudent?.archived ? "Unarchive Student" : "Archive Student"}
        description={
          selectedStudent?.archived
            ? `Are you sure you want to unarchive ${selectedStudent?.name}? They will be restored to the active students list.`
            : `Are you sure you want to archive ${selectedStudent?.name}? They will be hidden from the active students list and automatically deleted after 2 years.`
        }
        confirmText={selectedStudent?.archived ? "Unarchive" : "Archive"}
        cancelText="Cancel"
        variant={selectedStudent?.archived ? "default" : "destructive"}
      />

      <StudentDetailsModal
        studentId={selectedStudentId}
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedStudentId(null)
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Students</CardTitle>
            {filter === 'archived' && (
              <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                Archived students are automatically deleted after 2 years
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                              onClick={() => openArchiveModal(student)}
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
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} student(s)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevious || loading}
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
                      className="w-8 h-8 p-0"
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