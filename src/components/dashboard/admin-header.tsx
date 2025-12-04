"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import NotificationBell from "@/components/notifications/NotificationBell"
import { completeLogout } from "@/lib/google-oauth-utils"
import { cn } from "@/lib/utils"
import { Search, ChevronRight, LogOut, Menu, User } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminHeaderProps {
  onToggleSidebar?: () => void
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    return paths.map((path, index) => ({
      name: path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' '),
      href: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1
    }))
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden rounded-xl"
                onClick={onToggleSidebar}
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#1E293B] dark:text-slate-100">SmartU</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Smart Solutions for a Smarter BukSU</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              <Search className="h-4 w-4" />
            </Button>

            <NotificationBell />

            <ThemeToggle />

            <Separator orientation="vertical" className="h-6 dark:bg-slate-700" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-[#1E293B] dark:text-slate-100">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {session?.user?.role?.toLowerCase()}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium shadow">
                    {session?.user?.name?.charAt(0)}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <a href="/dashboard/profile/admin" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => completeLogout()}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {breadcrumbs.length > 1 && (
          <div className="pb-4 pt-1">
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center space-x-2">
                  {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />}
                  <Link
                    href={crumb.href}
                    className={cn(
                      "transition-colors hover:text-slate-900 dark:hover:text-white",
                      crumb.isLast 
                        ? "text-slate-900 dark:text-white font-medium" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    {crumb.name}
                  </Link>
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}


