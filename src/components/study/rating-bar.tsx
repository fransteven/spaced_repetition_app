"use client"

import type { FsrsRating } from "@/lib/fsrs/types"
import { Button } from "@/components/ui/button"
import { formatInterval, RATINGS } from "@/components/study/ratings"

interface Props {
  previews: Record<FsrsRating, number>
  onRate: (rating: FsrsRating) => void
  isRating: boolean
}

/**
 * Buttons and their FSRS interval previews as one unit. They used to be two
 * sibling rows with different layout algorithms (`grid-cols-4` over
 * `flex justify-between`), so an interval only roughly lined up with the button
 * it described.
 */
export function RatingBar({ previews, onRate, isRating }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {RATINGS.map((r) => (
          <Button
            key={r.key}
            type="button"
            size="xl"
            variant={r.variant}
            onClick={() => onRate(r.key)}
            disabled={isRating}
            className="relative h-auto flex-col gap-0.5 py-3"
          >
            <span
              aria-hidden
              className="absolute top-1.5 left-2 text-label-sm opacity-50"
            >
              {r.hotkey}
            </span>
            <span className="text-label-md normal-case">{r.label}</span>
            <span className="text-label-sm opacity-70">{formatInterval(previews[r.key])}</span>
          </Button>
        ))}
      </div>

      <p className="text-center text-body-sm text-on-surface-variant/60 italic">
        Select a rating to schedule the next review
      </p>
    </div>
  )
}
