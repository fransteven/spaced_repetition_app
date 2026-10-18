"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Bell, BookOpen, Layers, LayoutDashboard, Plus, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { CreateDeckDialog } from "@/components/decks/CreateDeckDialog"
import { Button } from "@/components/ui/button"
import { isNavActive } from "@/components/layout/nav-config"

const TABS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Layers, label: "Decks", href: "/decks" },
  { icon: BookOpen, label: "Library", href: "/library" },
  { icon: Bell, label: "Reminders", href: "/reminders" },
  { icon: Settings, label: "Settings", href: "/settings" },
] as const

export function MobileNav({ hasDueCards = false }: { hasDueCards?: boolean }): React.JSX.Element {
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
  }) => {
    const active = isNavActive(pathname, href)
    const isDueTab = href === "/" && hasDueCards

    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active
            ? "font-semibold text-primary"
            : "font-medium text-on-surface-variant hover:text-primary"
        )}
      >
        <div className="relative">
          <Icon className="h-6 w-6" />
          {isDueTab && (
            <span
              className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-state-struggling"
              aria-label="Cards due for review"
            />
          )}
        </div>
        <span className="w-full text-center text-label-sm tracking-tight normal-case">{label}</span>
      </Link>
    )
  }

  return (
    <>
      <nav aria-label="Main navigation" className="fixed right-0 bottom-0 left-0 z-50 grid grid-cols-6 items-center bg-surface-container-low px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-ambient-lg lg:hidden">
        {left.map(renderTab)}

        <div className="relative -top-6 flex justify-center">
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label="Create new deck"
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary shadow-ambient-lg transition-transform hover:opacity-90 active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </div>

        {right.map(renderTab)}
      </nav>

      <CreateDeckDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
