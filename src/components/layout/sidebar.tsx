"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { LayoutDashboard, Layers, Bell, BookOpen, BarChart2, Settings } from "lucide-react"

import { AppLogo } from "@/components/ui/app-logo"

const NAV_LINKS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Layers, label: "Decks", href: "/decks" },
  { icon: Bell, label: "Reminders", href: "/reminders" },
  { icon: BookOpen, label: "Library", href: "/library" },
  { icon: BarChart2, label: "Analytics", href: "/analytics" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low py-8 px-6 pt-24 z-40">
      {/* Branding */}
      <div className="mb-8 flex flex-col gap-1">
        <AppLogo size="md" href="/" />
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest pl-1 mt-0.5">
          The Digital Curator
        </p>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/")
          const Icon = link.icon
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                isActive
                  ? "text-primary font-bold bg-primary/10"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low font-medium"
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="pt-8 mt-8 border-t border-outline-variant/10 space-y-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary transition-all text-sm"
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
