"use client"

import { useState } from "react"
import type { FsrsRating } from "@/lib/fsrs/types"
import { Button } from "@/components/ui/button"
import { formatInterval, RATINGS } from "@/components/study/ratings"
import { cn } from "@/lib/utils"

interface Props {
  previews: Record<FsrsRating, number>
  onRate: (rating: FsrsRating) => void
  isRating: boolean
}

/**
 * Rating bar with 4 equal-weight tonal containers (DESIGN.md §5 & UI_REDESIGN_PLAN §5.1)
 * Provides immediate feedback with animate-pop-in upon rating.
 */
export function RatingBar({ previews, onRate, isRating }: Props) {
  const [ratedKey, setRatedKey] = useState<FsrsRating | null>(null)

  const handleRate = (key: FsrsRating) => {
    setRatedKey(key)
    onRate(key)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {RATINGS.map((r) => {
          const isChosen = isRating && ratedKey === r.key
          return (
            <Button
              key={r.key}
              type="button"
              size="xl"
              variant="ghost"
              onClick={() => handleRate(r.key)}
              disabled={isRating}
              className={cn(
                "relative h-auto flex-col gap-0.5 py-3 cursor-pointer font-medium transition-all",
                r.buttonClass,
                isChosen && "animate-pop-in ring-2 ring-primary"
              )}
            >
              <span
                aria-hidden
                className="absolute top-1.5 left-2 text-label-sm opacity-50"
              >
                {r.hotkey}
              </span>
              <span className="text-label-md normal-case font-semibold">{r.label}</span>
              <span className="text-label-sm opacity-80">{formatInterval(previews[r.key])}</span>
            </Button>
          )
        })}
      </div>

      <p className="text-center text-body-sm text-on-surface-variant/70 italic">
        Select a rating to schedule the next review
      </p>
    </div>
  )
}
