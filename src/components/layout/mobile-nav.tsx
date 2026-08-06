"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Bell, Layers, LayoutDashboard, Plus, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { CreateDeckDialog } from "@/components/decks/CreateDeckDialog"
import { isNavActive } from "@/components/layout/nav-config"

const TABS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Layers, label: "Decks", href: "/decks" },
  { icon: Bell, label: "Reminders", href: "/reminders" },
  { icon: Settings, label: "Settings", href: "/settings" },
] as const

export function MobileNav() {
  const pathname = usePathname()
  const [createOpen, setCreateOpen] = useState(false)

  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)]

  const renderTab = ({
    icon: Icon,
    label,
    href,
  }: {
    icon: typeof LayoutDashboard
    label: string
    href: string
  }) => (
    <Link
      key={href}
      href={href}
      aria-current={isNavActive(pathname, href) ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors",
        isNavActive(pathname, href)
          ? "font-semibold text-primary"
          : "font-medium text-on-surface-variant hover:text-primary"
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="text-label-sm normal-case">{label}</span>
    </Link>
  )

  return (
    <>
      <nav className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-around bg-surface-container-low px-4 py-3 shadow-ambient-lg lg:hidden">
        {left.map(renderTab)}

        <div className="relative -top-6">
          <button
            onClick={() => setCreateOpen(true)}
            aria-label="Create new deck"
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary shadow-ambient-lg transition-transform hover:opacity-90 active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>

        {right.map(renderTab)}
      </nav>

      <CreateDeckDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
