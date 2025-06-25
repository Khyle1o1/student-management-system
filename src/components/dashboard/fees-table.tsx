"use client"

import { useState, useEffect } from "react"
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
  DollarSign,
  Calendar,
  RefreshCw,
  GraduationCap
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
  createdAt: string
}

export function FeesTable() {
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
        setFees(data)
        setFilteredFees(data)
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
        fee.schoolYear.toLowerCase().includes(searchLower)
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

  const getFeeTypeBadgeColor = (feeType: string) => {
    switch (feeType.toLowerCase().replace(' ', '_')) {
      case "organization_fee": return "bg-blue-100 text-blue-800"
      case "activity_fee": return "bg-green-100 text-green-800"
      case "registration_fee": return "bg-purple-100 text-purple-800"
      case "laboratory_fee": return "bg-orange-100 text-orange-800"
      case "library_fee": return "bg-indigo-100 text-indigo-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "No due date"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isDueSoon = (dueDateString: string) => {
    if (!dueDateString) return false
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))
    return dueDate <= thirtyDaysFromNow && dueDate >= today
  }

  const isOverdue = (dueDateString: string) => {
    if (!dueDateString) return false
    const dueDate = new Date(dueDateString)
    const today = new Date()
    return dueDate < today
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2 py-8">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Loading fees...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={fetchFees}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>School Year</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-3">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      {searchTerm ? "No fees found matching your search." : "No fee structures found."}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredFees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-semibold">{fee.name}</span>
                      {fee.description && (
                        <span className="text-sm text-muted-foreground">
                          {fee.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={getFeeTypeBadgeColor(fee.type)}
                    >
                      {fee.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {formatCurrency(fee.amount)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className={`
                        ${isOverdue(fee.dueDate) ? 'text-red-600 font-semibold' : ''}
                        ${isDueSoon(fee.dueDate) ? 'text-orange-600 font-semibold' : ''}
                      `}>
                        {formatDate(fee.dueDate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 mr-1" />
                      {fee.semester || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{fee.schoolYear}</span>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/fees/${fee.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteFee(fee.id)}
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
    </div>
  )
} 