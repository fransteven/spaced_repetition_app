"use client"

import { useEffect } from "react"

import type { FsrsRating } from "@/lib/fsrs/types"
import { RATING_BY_HOTKEY } from "@/components/study/ratings"
import { isTextEntry } from "@/lib/is-text-entry"

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("button, a[href], [role='button']") !== null
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
      if (e.repeat) return
      if (isTextEntry(e.target)) return

      if (e.key === " " || e.key === "Enter") {
        // A focused button or link owns Space/Enter. Intercepting here swallowed
        // the native click on a Tab-focused rating button and toggled the answer
        // closed instead, so the same question came back and no review was sent.
        if (isInteractive(e.target)) return
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
