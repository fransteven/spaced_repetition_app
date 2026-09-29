import { Bell, BookOpen, Layers, LayoutDashboard, Settings, type LucideIcon } from "lucide-react"

/**
 * Single source of truth for navigation and shell geometry.
 * The sidebar width and the main-content offset must always agree; keeping both
 * here prevents the two from drifting across files.
 */
export const SIDEBAR_WIDTH = "w-64"
export const SIDEBAR_OFFSET = "lg:ml-64"
export const CONTENT_PADDING = "px-4 sm:px-6 lg:pl-16 lg:pr-10"
export const SHELL_CLEARANCE = "pt-20 sm:pt-24 pb-24 lg:pb-12"
export const NAV_TAGLINE = "Calm & Reward"

export interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

export const PRIMARY_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Layers, label: "Decks", href: "/decks" },
  { icon: BookOpen, label: "Library", href: "/library" },
  { icon: Bell, label: "Reminders", href: "/reminders" },
]

export const SECONDARY_NAV: NavItem[] = [{ icon: Settings, label: "Settings", href: "/settings" }]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
