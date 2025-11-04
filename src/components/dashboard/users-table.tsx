"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { UserPlus, Edit, Archive, Eye, Trash2, Search, Filter } from "lucide-react"
import { getRoleDisplayName, getStatusDisplayName, type UserRole, type UserStatus } from "@/lib/rbac"
import { COLLEGES, getCoursesByCollege } from "@/lib/constants/academic-programs"

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  assigned_college?: string | null
  assigned_course?: string | null
  assigned_courses?: string[] | null
  created_at: string
  updated_at: string
  archived_at?: string | null
}

export function UsersTable() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [limit] = useState(100)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [collegeFilter, setCollegeFilter] = useState<string>("all")

  // Form state (ONLY for administrative users)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "COURSE_ORG" as UserRole, // Default to least privileged admin role
    assigned_college: "",
    assigned_course: "",
    assigned_courses: [] as string[],
    status: "ACTIVE" as UserStatus,
  })

  const [errors, setErrors] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)

  // No longer need client-side filtering since API handles it
  useEffect(() => {
    setFilteredUsers(users)
  }, [users])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      })
      
      if (roleFilter !== "all") params.append("role", roleFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (collegeFilter !== "all") params.append("college", collegeFilter)
      if (searchQuery) params.append("search", searchQuery)
      
      const response = await fetch(`/api/users?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setTotalUsers(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 0)
      } else {
        console.error("Failed to fetch users")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, limit, roleFilter, statusFilter, collegeFilter, searchQuery])

  // Fetch users when page or filters change
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setIsEditing(true)
      setSelectedUser(user)
      setFormData({
        email: user.email,
        password: "",
        name: user.name,
        role: user.role,
        assigned_college: user.assigned_college || "",
        assigned_course: user.assigned_course || "",
        assigned_courses: (user as any).assigned_courses || (user.assigned_course ? [user.assigned_course] : []),
        status: user.status,
      })
    } else {
      setIsEditing(false)
      setSelectedUser(null)
      setFormData({
        email: "",
        password: "",
        name: "",
        role: "COURSE_ORG", // Default to least privileged admin role
        assigned_college: "",
        assigned_course: "",
        assigned_courses: [],
        status: "ACTIVE",
      })
    }
    setErrors({})
    setShowUserDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    // Client-side validation
    const newErrors: any = {}
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }
    
    if (!isEditing) {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = "Invalid email format"
      }
      
      if (!formData.password) {
        newErrors.password = "Password is required"
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters"
      }
    }
    
    // Validate role-specific requirements
    if (formData.role === "COLLEGE_ORG" || formData.role === "COURSE_ORG") {
      if (!formData.assigned_college || !formData.assigned_college.trim()) {
        newErrors.assigned_college = "College assignment is required for this role"
      }
    }
    
    if (formData.role === "COURSE_ORG") {
      if (!formData.assigned_courses || formData.assigned_courses.length === 0) {
        newErrors.assigned_course = "Select at least one course (max 2)"
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setSubmitting(true)

    try {
      const url = isEditing ? `/api/users/${selectedUser?.id}` : "/api/users"
      const method = isEditing ? "PATCH" : "POST"
      
      const body: any = {
        name: formData.name.trim(),
        role: formData.role,
        // Normalize empty strings to null
        assigned_college: formData.assigned_college && formData.assigned_college.trim() ? formData.assigned_college.trim() : null,
        assigned_course: formData.assigned_course && formData.assigned_course.trim() ? formData.assigned_course.trim() : null,
        assigned_courses: formData.assigned_courses && formData.assigned_courses.length > 0 ? formData.assigned_courses : null,
      }

      if (isEditing) {
        body.status = formData.status
      } else {
        body.email = formData.email.trim().toLowerCase()
        body.password = formData.password
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setShowUserDialog(false)
        fetchUsers()
      } else {
        // Show detailed error message if available
        let errorMessage = data.message || data.error || "Failed to save user"
        
        // If we have validation details, format them nicely
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          const fieldErrors = data.details.map((err: any) => {
            const field = err.path?.join('.') || 'unknown'
            return `${field}: ${err.message}`
          })
          errorMessage = fieldErrors.join('; ')
          console.error('Validation errors:', data.details)
        }
        
        setErrors({ general: errorMessage })
      }
    } catch (error) {
      console.error("Error saving user:", error)
      setErrors({ general: "An error occurred" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async () => {
    if (!selectedUser) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" })
      })

      if (response.ok) {
        setShowArchiveDialog(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to archive user")
      }
    } catch (error) {
      console.error("Error archiving user:", error)
      alert("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword })
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedUser(null)
        setDeletePassword("")
        setDeleteError(null)
        fetchUsers()
      } else {
        const data = await response.json()
        setDeleteError(data.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      setDeleteError("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const canManageUser = (user: User) => {
    if (session?.user.role === 'ADMIN') return true
    
    // COLLEGE_ORG can only manage COURSE_ORG in their college
    if (session?.user.role === 'COLLEGE_ORG') {
      return user.role === 'COURSE_ORG' && 
             user.assigned_college === session.user.assigned_college
    }
    
    return false
  }

  const getAvailableRoles = (): UserRole[] => {
    if (session?.user.role === 'ADMIN') {
      return ['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG']
    }
    if (session?.user.role === 'COLLEGE_ORG') {
      return ['COURSE_ORG']
    }
    return []
  }

  const getAvailableColleges = () => {
    if (session?.user.role === 'ADMIN') {
      return COLLEGES
    }
    if (session?.user.role === 'COLLEGE_ORG' && session.user.assigned_college) {
      return [session.user.assigned_college]
    }
    return []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage system users and their permissions
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to page 1 on search
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Roles</option>
                <option value="ADMIN">System Administrator (SSC)</option>
                <option value="COLLEGE_ORG">College Organization</option>
                <option value="COURSE_ORG">Course Organization</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>College</Label>
              <select
                value={collegeFilter}
                onChange={(e) => {
                  setCollegeFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Colleges</option>
                {COLLEGES.map((college) => (
                  <option key={college} value={college}>
                    {college}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({totalUsers.toLocaleString()})</CardTitle>
          <CardDescription>
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalUsers)} of {totalUsers.toLocaleString()} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.assigned_college || "—"}</TableCell>
                      <TableCell>{user.assigned_course || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "ACTIVE"
                              ? "default"
                              : user.status === "ARCHIVED"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {getStatusDisplayName(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManageUser(user) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowArchiveDialog(true)
                                }}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowDeleteDialog(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* User Dialog (Add/Edit) */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update user information and permissions"
                : "Create a new user account with appropriate permissions"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {errors.general && (
                <div className="text-sm text-red-500">{errors.general}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <div className="text-sm text-red-500">{errors.name}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isEditing}
                    required
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <div className="text-sm text-red-500">{errors.email}</div>
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    placeholder="Minimum 8 characters"
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && (
                    <div className="text-sm text-red-500">{errors.password}</div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as UserRole,
                        assigned_college: "",
                        assigned_course: "",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {getAvailableRoles().map((role) => (
                      <option key={role} value={role}>
                        {getRoleDisplayName(role)}
                      </option>
                    ))}
                  </select>
                </div>

                {isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as UserStatus,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                )}
              </div>

              {(formData.role === "COLLEGE_ORG" || formData.role === "COURSE_ORG") && (
                <div className="space-y-2">
                  <Label htmlFor="college">Assigned College *</Label>
                  <select
                    id="college"
                    value={formData.assigned_college}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assigned_college: e.target.value,
                        assigned_course: "",
                      })
                    }
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.assigned_college ? "border-red-500" : ""}`}
                    required
                  >
                    <option value="">Select College</option>
                    {getAvailableColleges().map((college) => (
                      <option key={college} value={college}>
                        {college}
                      </option>
                    ))}
                  </select>
                  {errors.assigned_college && (
                    <div className="text-sm text-red-500">{errors.assigned_college}</div>
                  )}
                </div>
              )}

              {formData.role === "COURSE_ORG" && formData.assigned_college && (
                <div className="space-y-2">
                  <Label htmlFor="courses">Assigned Course(s) * (up to 2)</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-auto border rounded-md p-3">
                    {getCoursesByCollege(formData.assigned_college).map((course) => {
                      const checked = formData.assigned_courses.includes(course)
                      return (
                        <label key={course} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = checked
                                ? formData.assigned_courses.filter((c) => c !== course)
                                : (formData.assigned_courses.length < 2
                                    ? [...formData.assigned_courses, course]
                                    : formData.assigned_courses)
                              setFormData({ ...formData, assigned_courses: next, assigned_course: next[0] || "" })
                            }}
                          />
                          <span>{course}</span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.assigned_course && (
                    <div className="text-sm text-red-500">{errors.assigned_course}</div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUserDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive User</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {selectedUser?.name}? This user will
              lose access to the system but their data will be retained for audit
              purposes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleArchive}
              disabled={submitting}
            >
              {submitting ? "Archiving..." : "Archive User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) { setDeletePassword(""); setDeleteError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This is permanent. {selectedUser?.name} will be deleted and can no longer sign in.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="text-sm text-red-500">{deleteError}</div>
          )}
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-password">Confirm deletion with your password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting || !deletePassword}
            >
              {submitting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

