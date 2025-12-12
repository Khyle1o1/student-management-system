"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"
import { SessionTimeoutManager } from "@/components/session-timeout-manager"
import { SessionRecovery } from "@/components/session-recovery"
import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds - data stays fresh
        gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection (formerly cacheTime)
        refetchOnWindowFocus: false, // Prevent unnecessary refetches
        refetchOnReconnect: true, // Refetch when connection restored
        retry: 1, // Only retry once on failure
        retryDelay: 1000, // 1 second between retries
      },
    },
  }))

  return (
    <SessionProvider
      // Configure session refetch to be resilient to mode switches
      refetchInterval={5 * 60} // Refetch every 5 minutes (in seconds)
      refetchOnWindowFocus={true} // Refetch when window gains focus
      // Base path for NextAuth API - ensures cookies are read correctly
      basePath="/api/auth"
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SessionTimeoutManager />
          <SessionRecovery />
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
} 