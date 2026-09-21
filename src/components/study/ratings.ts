import type { FsrsRating } from "@/lib/fsrs/types"

export interface RatingSpec {
  key: FsrsRating
  label: string
  hotkey: string
  /** Solid token for the session-count dot. */
  dot: string
  /** Tonal classes for an equal-weight 4-way choice — DESIGN.md §2 & §5. */
  buttonClass: string
}

/**
 * Single source of truth for the four FSRS ratings.
 * Equal visual weight via tonal containers, distinct in color.
 */
export const RATINGS: readonly RatingSpec[] = [
  {
    key: "again",
    label: "Again",
    hotkey: "1",
    dot: "bg-state-struggling",
    buttonClass:
      "bg-state-struggling-container text-on-state-struggling-container hover:bg-state-struggling-container/80",
  },
  {
    key: "hard",
    label: "Hard",
    hotkey: "2",
    dot: "bg-state-intermediate",
    buttonClass:
      "bg-state-intermediate-container text-on-state-intermediate-container hover:bg-state-intermediate-container/80",
  },
  {
    key: "good",
    label: "Good",
    hotkey: "3",
    dot: "bg-state-new",
    buttonClass:
      "bg-state-new-container text-on-state-new-container hover:bg-state-new-container/80",
  },
  {
    key: "easy",
    label: "Easy",
    hotkey: "4",
    dot: "bg-state-mastered",
    buttonClass:
      "bg-state-mastered-container text-on-state-mastered-container hover:bg-state-mastered-container/80",
  },
]

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
