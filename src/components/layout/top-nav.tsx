"use client"

import Link from "next/link"
import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { LogOut, Menu, Search, Settings } from "lucide-react"

import { AppLogo } from "@/components/ui/app-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MobileDrawer } from "@/components/layout/mobile-drawer"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { CommandPalette, type PaletteDeck } from "@/components/search/command-palette"
import { useCommandPaletteHotkey } from "@/hooks/use-command-palette-hotkey"

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

export interface TopNavProps {
  decks?: PaletteDeck[]
}

export function TopNav({ decks = [] }: TopNavProps): React.JSX.Element {
  const { data: session } = useSession()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useCommandPaletteHotkey({ open: paletteOpen, onOpenChange: setPaletteOpen })

  const name = session?.user?.name ?? null
  const email = session?.user?.email ?? null

  return (
    <>
      {/* The blur is the separation — no border. DESIGN.md §6 */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-background/80 px-4 py-4 backdrop-blur-[12px] sm:px-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <AppLogo size="sm" href="/" />
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setPaletteOpen(true)}
          className="hidden sm:flex h-9 w-48 md:w-64 items-center justify-between rounded-lg bg-surface-container-low px-3 text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface cursor-pointer"
          aria-label="Open quick search"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-outline" />
            <span className="hidden md:inline">Search…</span>
          </span>
          <kbd className="hidden md:inline-flex items-center rounded bg-surface-container-high px-1.5 text-label-sm text-on-surface-variant">
            ⌘K
          </kbd>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPaletteOpen(true)}
            className="sm:hidden text-on-surface-variant"
            aria-label="Open quick search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <ThemeToggle className="hidden sm:flex" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  className="flex cursor-pointer items-center gap-3 rounded-full transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
              }
            >
              <span className="hidden text-sm font-medium text-on-surface sm:inline-block">
                {name ?? "Account"}
              </span>
              <Avatar className="size-9 ring-2 ring-primary/10">
                {session?.user?.image ? (
                  <AvatarImage src={session.user.image} alt="" />
                ) : null}
                <AvatarFallback className="bg-surface-container-high text-xs font-bold text-on-surface-variant">
                  {initialsOf(name ?? email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {(name || email) && (
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  {name && <span className="text-sm font-medium text-on-surface">{name}</span>}
                  {email && (
                    <span className="text-body-sm font-normal text-on-surface-variant">
                      {email}
                    </span>
                  )}
                </DropdownMenuLabel>
              )}

              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>

              <div className="flex items-center justify-between px-2 py-1.5 sm:hidden">
                <span className="text-sm text-on-surface-variant">Theme</span>
                <ThemeToggle />
              </div>

              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <CommandPalette decks={decks} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}
