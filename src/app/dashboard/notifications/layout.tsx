"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Settings, FileText } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

interface NotificationsLayoutProps {
  children: ReactNode
}

export default function NotificationsLayout({ children }: NotificationsLayoutProps) {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Settings",
      href: "/dashboard/notifications/settings",
      icon: Settings,
    },
    {
      name: "Logs",
      href: "/dashboard/notifications/logs",
      icon: FileText,
    },
  ]

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = pathname === tab.href

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    isActive
                      ? "border-[#191970] text-[#191970]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-2 h-5 w-5",
                      isActive
                        ? "text-[#191970]"
                        : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {tab.name}
                </Link>
              )
            })}
          </nav>
        </div>
        {children}
      </div>
    </DashboardShell>
  )
}

