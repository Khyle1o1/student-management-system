"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeesTable } from "./fees-table"
import { PaymentManagement } from "./payment-management"
import { Plus, DollarSign, CreditCard } from "lucide-react"
import Link from "next/link"

export function FeesManagement() {
  const [activeTab, setActiveTab] = useState("structures")

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="structures" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Fee Structures</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Payment Tracking</span>
            </TabsTrigger>
          </TabsList>
          
          {activeTab === "structures" && (
            <Link href="/dashboard/fees/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Fee Structure
              </Button>
            </Link>
          )}
        </div>

        <TabsContent value="structures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structures</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage and configure different types of fees for the school
              </p>
            </CardHeader>
            <CardContent>
              <FeesTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Payment Tracking</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    View and manage payment status for each student and fee. Click the checkmarks to quickly toggle payment status, 
                    or use the edit button for detailed payment information including payment method and reference numbers.
                  </p>
                </div>
              </div>
            </div>
            <PaymentManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 