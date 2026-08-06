"use client"

import { useEffect } from "react"

import type { FsrsRating } from "@/lib/fsrs/types"
import { RATING_BY_HOTKEY } from "@/components/study/ratings"

const TEXT_ENTRY = new Set(["INPUT", "TEXTAREA", "SELECT"])

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (TEXT_ENTRY.has(target.tagName)) return true
  if (target.isContentEditable) return true
  return target.getAttribute("role") === "textbox"
}

interface Options {
  revealed: boolean
  /** Suspends every shortcut — the exam chat and the card editor own the keyboard. */
  disabled: boolean
  onToggleReveal: () => void
  onRate: (rating: FsrsRating) => void
}

/**
 * Study keyboard shortcuts.
 *
 * The previous inline handler never checked `e.target`, so typing "1" into the
 * exam dialog's textarea — reachable from the answer view, where the listener
 * was live — submitted an `again` rating and advanced the card.
 */
export function useStudyHotkeys({ revealed, disabled, onToggleReveal, onRate }: Options): void {
  useEffect(() => {
    if (disabled) return

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTextEntry(e.target)) return

      if (e.key === " " || e.key === "Enter") {
        // Space scrolls the page by default.
        e.preventDefault()
        onToggleReveal()
        return
      }

      if (!revealed) return

      const rating = RATING_BY_HOTKEY[e.key]
      if (rating) {
        e.preventDefault()
        onRate(rating)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [revealed, disabled, onToggleReveal, onRate])
}
