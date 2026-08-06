import type { FsrsRating } from "@/lib/fsrs/types"

export interface RatingSpec {
  key: FsrsRating
  label: string
  hotkey: string
  /** Solid token for the session-count dot. */
  dot: string
  /** Button variant — the dot and the button must never disagree again. */
  variant: "destructive" | "outline" | "default" | "tertiary"
}

/**
 * Single source of truth for the four FSRS ratings.
 *
 * This used to live in `question-view.tsx` with separate `active`/`idle` class
 * strings that had drifted apart: Hard's dot was `bg-secondary` while its
 * button was an outline, and Good's dot was `bg-primary` while its button was
 * `bg-primary-container`.
 */
export const RATINGS: readonly RatingSpec[] = [
  { key: "again", label: "Again", hotkey: "1", dot: "bg-destructive", variant: "destructive" },
  { key: "hard", label: "Hard", hotkey: "2", dot: "bg-outline", variant: "outline" },
  { key: "good", label: "Good", hotkey: "3", dot: "bg-primary", variant: "default" },
  { key: "easy", label: "Easy", hotkey: "4", dot: "bg-tertiary", variant: "tertiary" },
] as const

export const RATING_BY_HOTKEY: Record<string, FsrsRating> = Object.fromEntries(
  RATINGS.map((r) => [r.hotkey, r.key])
)

export function formatInterval(days: number): string {
  if (days === 0) return "< 1 day"
  if (days === 1) return "1 day"
  if (days < 7) return `${days} days`
  if (days < 30) {
    const wks = Math.round(days / 7)
    return wks === 1 ? "1 wk" : `${wks} wks`
  }
  const mo = Math.round(days / 30)
  return mo === 1 ? "1 mo" : `${mo} mo`
}
