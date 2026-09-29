"use client"

import { usePathname } from "next/navigation"
import type { PaletteDeck } from "@/components/search/command-palette"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import {
  CONTENT_PADDING,
  SHELL_CLEARANCE,
  SIDEBAR_OFFSET,
} from "@/components/layout/nav-config"
import { cn } from "@/lib/utils"

export interface DashboardShellProps {
  children: React.ReactNode
  decks?: PaletteDeck[]
  hasDueCards?: boolean
}

export function DashboardShell({
  children,
  decks = [],
  hasDueCards = false,
}: DashboardShellProps): React.JSX.Element {
  const pathname = usePathname()
  // Study sessions and the reader are immersive — no shell chrome.
  const isImmersive = pathname.startsWith("/study") || pathname.startsWith("/read")

  if (isImmersive) {
    return <>{children}</>
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <TopNav decks={decks} />
      <Sidebar />
      <main className={cn(SHELL_CLEARANCE, CONTENT_PADDING, SIDEBAR_OFFSET)}>
        {children}
      </main>
      <MobileNav hasDueCards={hasDueCards} />
    </div>
  )
}
