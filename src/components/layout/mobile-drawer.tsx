"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import {
  isNavActive,
  PRIMARY_NAV,
  SECONDARY_NAV,
  type NavItem,
} from "@/components/layout/nav-config"

/**
 * Navigation for everything below `lg`. The bottom tab bar only carries four
 * destinations, so without this drawer Settings and sign-out are unreachable
 * on tablets.
 */
export function MobileDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()

  const renderLink = (item: NavItem) => {
    const active = isNavActive(pathname, item.href)
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => onOpenChange(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
          active
            ? "bg-primary/10 font-semibold text-primary"
            : "font-medium text-on-surface-variant hover:bg-surface-container hover:text-primary"
        )}
      >
        <Icon className="h-5 w-5" />
        {item.label}
      </Link>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="bg-surface-container-low lg:hidden">
        <SheetHeader>
          <SheetTitle className="text-label-sm text-on-surface-variant uppercase">
            The Digital Curator
          </SheetTitle>
        </SheetHeader>

        <nav className="space-y-1 px-4">{PRIMARY_NAV.map(renderLink)}</nav>

        <div className="mt-auto space-y-4 px-4 pb-6">
          <nav className="space-y-1">{SECONDARY_NAV.map(renderLink)}</nav>
          <ThemeToggle className="w-fit" />
          <Button
            variant="ghost"
            size="lg"
            className="w-full justify-start px-4 text-on-surface-variant"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
