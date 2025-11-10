"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  BarChart3, 
  Copy, 
  Eye,
  Search,
  ExternalLink
} from "lucide-react"
import { toast } from "react-hot-toast"
import { format } from "date-fns"

interface Form {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  response_count: number
  created_at: string
  published_at: string | null
  creator: {
    name: string
    email: string
  }
}

export function FormsTable() {
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchForms()
  }, [page, search, statusFilter])

  const fetchForms = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/forms?${params}`)
      if (!response.ok) throw new Error('Failed to fetch forms')
      
      const data = await response.json()
      setForms(data.forms || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching forms:', error)
      toast.error('Failed to load forms')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      const response = await fetch(`/api/forms/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete form')
      
      toast.success('Form deleted successfully')
      fetchForms()
    } catch (error) {
      console.error('Error deleting form:', error)
      toast.error('Failed to delete form')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      // Fetch the form to duplicate
      const response = await fetch(`/api/forms/${id}`)
      if (!response.ok) throw new Error('Failed to fetch form')
      
      const form = await response.json()
      
      // Create a new form with copied data
      const duplicateResponse = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${form.title} (Copy)`,
          description: form.description,
          questions: form.questions,
          settings: form.settings,
          status: 'DRAFT',
        }),
      })

      if (!duplicateResponse.ok) throw new Error('Failed to duplicate form')
      
      const duplicatedForm = await duplicateResponse.json()
      toast.success('Form duplicated successfully')
      router.push(`/dashboard/forms/${duplicatedForm.id}/edit`)
    } catch (error) {
      console.error('Error duplicating form:', error)
      toast.error('Failed to duplicate form')
    }
  }

  const copyFormLink = (formId: string) => {
    const link = `${window.location.origin}/forms/${formId}`
    navigator.clipboard.writeText(link)
    toast.success('Form link copied to clipboard!')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      DRAFT: { variant: "outline", label: "Draft" },
      PUBLISHED: { variant: "default", label: "Published" },
      CLOSED: { variant: "destructive", label: "Closed" },
    }
    const config = variants[status] || variants.DRAFT
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading && forms.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading forms...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forms & Evaluations</h1>
          <p className="text-muted-foreground">
            Create and manage evaluation forms similar to Google Forms
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/forms/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Form
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Table */}
      {forms.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No forms found</p>
          <Button onClick={() => router.push('/dashboard/forms/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Form
          </Button>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{form.title}</div>
                        {form.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {form.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(form.status)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{form.response_count}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(form.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {form.published_at ? format(new Date(form.published_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/forms/${form.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/forms/${form.id}/statistics`)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Statistics
                          </DropdownMenuItem>
                          {form.status === 'PUBLISHED' && (
                            <>
                              <DropdownMenuItem onClick={() => copyFormLink(form.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/forms/${form.id}`, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Form
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicate(form.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(form.id, form.title)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} forms
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

