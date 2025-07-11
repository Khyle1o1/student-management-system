"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Search, 
  Edit, 
  Trash2, 
  Settings,
  GraduationCap,
  Building,
  Globe,
  Calendar,
  DollarSign
} from "lucide-react"
import Link from "next/link"

interface Fee {
  id: string
  name: string
  type: string
  amount: number
  description: string
  dueDate: string
  semester: string
  schoolYear: string
  scope_type: string
  scope_college: string
  scope_course: string
  createdAt: string
}

export function FeesTable() {
  const router = useRouter()
  const [fees, setFees] = useState<Fee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredFees, setFilteredFees] = useState<Fee[]>([])

  const fetchFees = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/fees")
      if (response.ok) {
        const data = await response.json()
        setFees(data.fees || [])
        setFilteredFees(data.fees || [])
      }
    } catch (error) {
      console.error("Error fetching fees:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFees()
  }, [])

  useEffect(() => {
    const filtered = fees.filter((fee) => {
      const searchLower = searchTerm.toLowerCase()
      
      return fee.name.toLowerCase().includes(searchLower) ||
        fee.type.toLowerCase().includes(searchLower) ||
        fee.description.toLowerCase().includes(searchLower) ||
        fee.semester.toLowerCase().includes(searchLower) ||
        fee.schoolYear.toLowerCase().includes(searchLower) ||
        fee.scope_type.toLowerCase().includes(searchLower) ||
        fee.scope_college?.toLowerCase().includes(searchLower) ||
        fee.scope_course?.toLowerCase().includes(searchLower)
    })
    setFilteredFees(filtered)
  }, [searchTerm, fees])

  const handleDeleteFee = async (feeId: string) => {
    if (!confirm("Are you sure you want to delete this fee? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/fees/${feeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchFees() // Refresh the list
      } else {
        alert("Error deleting fee")
      }
    } catch (error) {
      console.error("Error deleting fee:", error)
      alert("Error deleting fee")
    }
  }

  const getScopeBadge = (scope_type: string, scope_college?: string, scope_course?: string) => {
    switch (scope_type) {
      case "UNIVERSITY_WIDE":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Globe className="h-3 w-3 mr-1" />
            University-wide
          </Badge>
        )
      case "COLLEGE_WIDE":
        return (
          <Badge className="bg-green-100 text-green-800">
            <Building className="h-3 w-3 mr-1" />
            {scope_college ? scope_college.split(' ').slice(-1)[0] : 'College-wide'}
          </Badge>
        )
      case "COURSE_SPECIFIC":
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <GraduationCap className="h-3 w-3 mr-1" />
            Course-specific
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            {scope_type}
          </Badge>
        )
    }
  }

  const getFeeTypeBadge = (type: string) => {
    const typeColors = {
      "organization fee": "bg-purple-100 text-purple-800",
      "activity fee": "bg-orange-100 text-orange-800",
      "registration fee": "bg-blue-100 text-blue-800",
      "laboratory fee": "bg-indigo-100 text-indigo-800",
      "library fee": "bg-pink-100 text-pink-800",
      "other": "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || typeColors.other}>
        {type.replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "No due date"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search fees..."
              className="pl-10 w-64"
              disabled
            />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading fees...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search fees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredFees.length} of {fees.length} fees
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>School Year</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFees.map((fee) => (
              <TableRow key={fee.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{fee.name}</p>
                    {fee.description && (
                      <p className="text-sm text-gray-600 truncate max-w-xs">
                        {fee.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getFeeTypeBadge(fee.type)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {getScopeBadge(fee.scope_type, fee.scope_college, fee.scope_course)}
                    {fee.scope_type === "COLLEGE_WIDE" && fee.scope_college && (
                      <p className="text-xs text-gray-600">{fee.scope_college}</p>
                    )}
                    {fee.scope_type === "COURSE_SPECIFIC" && fee.scope_course && (
                      <p className="text-xs text-gray-600">{fee.scope_course}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(fee.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formatDate(fee.dueDate)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {fee.schoolYear}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Link href={`/dashboard/fees/${fee.id}/manage`}>
                      <Button variant="outline" size="sm">
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/dashboard/fees/${fee.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFee(fee.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredFees.length === 0 && !loading && (
        <div className="text-center py-8">
          <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            {searchTerm ? "No fees match your search." : "No fees found."}
          </p>
          {!searchTerm && (
            <Link href="/dashboard/fees/new">
              <Button className="mt-4">Create Your First Fee</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
} 