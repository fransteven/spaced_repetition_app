"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_LINKS = [
  { icon: "dashboard", label: "Dashboard", href: "/" },
  { icon: "style", label: "Decks", href: "/decks" },
  { icon: "notifications_active", label: "Reminders", href: "/reminders" },
  { icon: "library_books", label: "Library", href: "/library" },
  { icon: "leaderboard", label: "Analytics", href: "/analytics" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low py-8 px-6 pt-24 z-40">
      {/* Branding */}
      <div className="mb-8">
        <h2 className="text-lg font-black text-on-surface leading-tight">The Cognitive Atelier</h2>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
          The Digital Curator
        </p>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/")
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
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {link.icon}
              </span>
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
          <span className="material-symbols-outlined">settings</span>
          Settings
        </Link>
      </div>
    </aside>
  )
}
