"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"

import { cn } from "@/lib/utils"

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

/**
 * Three-state theme switcher. Renders a neutral placeholder until mounted —
 * the server has no way to know the resolved theme, so painting an icon before
 * hydration guarantees a wrong-icon flash.
 */
const subscribeNoop = () => () => {}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn("flex items-center gap-1 rounded-full bg-surface-container-low p-1", className)}
    >
      {THEMES.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-card text-primary shadow-ambient"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}
