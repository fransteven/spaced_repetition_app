"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SIDEBAR_OFFSET } from "@/components/layout/nav-config"
import { cn } from "@/lib/utils"

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
      {/* Asymmetric page margins — DESIGN.md §6 */}
      <main className={cn("pt-24 pb-28 pl-4 pr-4 sm:pl-10 sm:pr-6 lg:pl-16 lg:pr-10", SIDEBAR_OFFSET)}>
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
