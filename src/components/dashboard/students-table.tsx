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
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Mail, 
  Phone,
  User,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

interface Student {
  id: string
  studentId: string
  name: string
  email: string
  yearLevel: string
  section: string
  course: string
  phoneNumber?: string
  address?: string
  enrolledAt: string
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
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/students")
      if (response.ok) {
        const data = await response.json()
        setStudents(data)
        setFilteredStudents(data)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    const filtered = students.filter((student) => {
      const searchLower = searchTerm.toLowerCase()
      
      return student.name.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower) ||
        student.course.toLowerCase().includes(searchLower)
    })
    setFilteredStudents(filtered)
  }, [searchTerm, students])

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchStudents() // Refresh the list
      } else {
        alert("Error deleting student")
      }
    } catch (error) {
      console.error("Error deleting student:", error)
      alert("Error deleting student")
    }
  }

  const getYearLevelBadgeColor = (yearLevel: string) => {
    switch (yearLevel) {
      case "1": return "bg-green-100 text-green-800"
      case "2": return "bg-blue-100 text-blue-800"
      case "3": return "bg-yellow-100 text-yellow-800"
      case "4": return "bg-red-100 text-red-800"
      case "5": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
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
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={fetchStudents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
                <TableHead>Course</TableHead>
                <TableHead>Year Level</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {searchTerm ? "No students found matching your search." : "No students found."}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.studentId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{student.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{student.course}</TableCell>
                    <TableCell>
                      <Badge className={getYearLevelBadgeColor(student.yearLevel)}>
                        Year {student.yearLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>
                      {student.phoneNumber ? (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{student.phoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(student.enrolledAt).toLocaleDateString()}
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
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/students/${student.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
        
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} student(s)
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 