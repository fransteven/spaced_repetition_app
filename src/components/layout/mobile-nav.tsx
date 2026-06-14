"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { CreateDeckDialog } from "@/components/decks/CreateDeckDialog"
import { LayoutDashboard, Layers, Bell, BarChart2, Plus } from "lucide-react"

export function MobileNav() {
  const pathname = usePathname()
  const [createOpen, setCreateOpen] = useState(false)

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  const navItemClass = (href: string) => {
    const isActive = isLinkActive(href)
    return `flex flex-col items-center gap-1 transition-colors ${
      isActive
        ? "text-primary font-bold"
        : "text-on-surface-variant hover:text-primary font-medium"
    }`
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-outline-variant/10 flex justify-around items-center px-4 py-3 z-50">
        <Link href="/" className={navItemClass("/")}>
          <LayoutDashboard className="h-6 w-6" />
          <span className="text-[10px]">Dashboard</span>
        </Link>
        
        <Link href="/decks" className={navItemClass("/decks")}>
          <Layers className="h-6 w-6" />
          <span className="text-[10px]">Decks</span>
        </Link>
        
        <div className="relative -top-6">
          <button
            onClick={() => setCreateOpen(true)}
            aria-label="Create new deck"
            className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>

        <Link href="/reminders" className={navItemClass("/reminders")}>
          <Bell className="h-6 w-6" />
          <span className="text-[10px]">Reminders</span>
        </Link>

        <Link href="/analytics" className={navItemClass("/analytics")}>
          <BarChart2 className="h-6 w-6" />
          <span className="text-[10px]">Stats</span>
        </Link>
      </nav>

      <CreateDeckDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
