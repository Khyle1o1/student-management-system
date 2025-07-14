"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FeesCards } from "./fees-cards"
import { Plus, DollarSign } from "lucide-react"
import Link from "next/link"

export function FeesManagement() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle>Fee Structures</CardTitle>
            </div>
            <Link href="/dashboard/fees/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Fee Structure
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage and configure different types of fees for the school
          </p>
        </CardHeader>
        <CardContent>
          <FeesCards />
        </CardContent>
      </Card>
    </div>
  )
} 