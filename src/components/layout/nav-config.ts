import { Bell, Layers, LayoutDashboard, Settings, type LucideIcon } from "lucide-react"

/**
 * Single source of truth for navigation and shell geometry.
 * The sidebar width and the main-content offset must always agree; keeping both
 * here prevents the two from drifting across files.
 */
export const SIDEBAR_WIDTH = "w-64"
export const SIDEBAR_OFFSET = "lg:ml-64"

export interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

export const PRIMARY_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Layers, label: "Decks", href: "/decks" },
  { icon: Bell, label: "Reminders", href: "/reminders" },
]

export const SECONDARY_NAV: NavItem[] = [{ icon: Settings, label: "Settings", href: "/settings" }]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
