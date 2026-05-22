"use client"

import type { StudyCardItem } from "@/lib/services/study-service"
import type { FsrsRating } from "@/lib/fsrs/types"
import { RATINGS } from "@/components/study/question-view"
import { MarkdownContent } from "@/components/ui/markdown-content"

function formatInterval(days: number): string {
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

interface Props {
  card:     StudyCardItem
  onRate:   (rating: FsrsRating) => void
  isRating: boolean
}

export function AnswerView({ card, onRate, isRating }: Props) {
  const hasImages = card.image_url_1 || card.image_url_2
  const images = [card.image_url_1, card.image_url_2].filter(Boolean) as string[]

  return (
    <div className="w-full max-w-[640px] flex flex-col gap-8">
      {/* Answer card */}
      <section
        className="bg-surface-container-lowest rounded-xl p-8 lg:p-12 border border-outline-variant/15"
        style={{ boxShadow: "0px 12px 32px rgba(25, 28, 29, 0.04)" }}
      >
        <div className="flex flex-col gap-6">
          {/* Original question */}
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
              {card.state}
            </span>
            <h2 className="text-base text-on-surface-variant mt-2">{card.front}</h2>
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-container-high w-full" />

          {/* Answer */}
          <div className="space-y-4">
            <MarkdownContent content={card.back} size="md" />
          </div>

          {/* Contextual images — only rendered when present */}
          {hasImages && (
            <div className="flex gap-4 pt-4">
              {images.map(src => (
                <div
                  key={src}
                  className="relative flex-1 aspect-[4/3] bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant/10 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt="Card image"
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Rating controls */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3">
          {RATINGS.map(r => {
            const rating = r.label.toLowerCase() as FsrsRating
            return (
              <button
                key={r.label}
                onClick={() => onRate(rating)}
                disabled={isRating}
                className={`h-12 flex items-center justify-center rounded-lg font-semibold transition-transform active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${r.active}`}
              >
                {r.label}
              </button>
            )
          })}
        </div>

        {/* FSRS preview intervals */}
        <div className="flex justify-between px-2">
          {RATINGS.map(r => {
            const rating = r.label.toLowerCase() as FsrsRating
            return (
              <div key={r.label} className="text-xs text-on-surface-variant text-center flex-1">
                <span className="block font-medium">{formatInterval(card.previews[rating])}</span>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-on-surface-variant/60 italic mt-2">
          Select a rating to schedule next review
        </p>
      </div>
    </div>
  )
}
