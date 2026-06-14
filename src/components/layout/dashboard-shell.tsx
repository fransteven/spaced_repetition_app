"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { MobileNav } from "@/components/layout/mobile-nav"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStudySession = pathname.startsWith("/study")

  if (isStudySession) {
    return <>{children}</>
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <TopNav />
      <Sidebar />
      <main className="lg:ml-64 pt-24 pb-24 px-4 sm:px-8">{children}</main>
      <MobileNav />
    </div>
  )
}
