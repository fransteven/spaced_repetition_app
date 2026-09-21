"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  isNavActive,
  NAV_TAGLINE,
  PRIMARY_NAV,
  SECONDARY_NAV,
  SIDEBAR_WIDTH,
  type NavItem,
} from "@/components/layout/nav-config"

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors duration-150",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "font-medium text-on-surface-variant hover:bg-surface-container hover:text-primary"
      )}
    >
      {/* 2px thread, echoing the mastery bar — DESIGN.md §5 */}
      {active && (
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-primary"
        />
      )}
      <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-on-surface-variant")} />
      {item.label}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 hidden h-screen flex-col bg-surface-container-low px-6 pt-24 pb-8 lg:flex",
        SIDEBAR_WIDTH
      )}
    >
      <p className="mb-8 pl-4 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
        {NAV_TAGLINE}
      </p>

      <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} active={isNavActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="mt-auto space-y-2 pt-8">
        {SECONDARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} active={isNavActive(pathname, item.href)} />
        ))}
      </div>
    </aside>
  )
}
