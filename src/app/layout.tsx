import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { DatabaseStatus } from "@/components/database-status";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Student Management System",
  description: "A comprehensive student management system for educational institutions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <DatabaseStatus pollingInterval={60000} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
