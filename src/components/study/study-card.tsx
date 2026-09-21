"use client"

import { useState } from "react"
import { ChevronUp, GraduationCap, Pencil } from "lucide-react"

import { cn } from "@/lib/utils"
import type { FsrsRating } from "@/lib/fsrs/types"
import type { StudyCardItem } from "@/lib/services/study-service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { Pill } from "@/components/primitives/pill"
import { Surface } from "@/components/primitives/surface"
import { RATINGS } from "@/components/study/ratings"
import { RatingBar } from "@/components/study/rating-bar"
import { getStabilityBucket, type LearningStateBucket } from "@/lib/learning-state"

type SessionCounts = Record<FsrsRating, number>

interface Props {
  card: StudyCardItem
  sessionCounts: SessionCounts
  revealed: boolean
  onToggleReveal: () => void
  onRate: (rating: FsrsRating) => void
  isRating: boolean
  onEdit: () => void
  onExam: () => void
}

function stateTone(card: StudyCardItem): LearningStateBucket {
  if (card.state === "new") return "new"
  if (card.state === "relearning") return "struggling"
  if (card.state === "learning") return "intermediate"
  return getStabilityBucket(card.stability)
}

/**
 * One container that never unmounts. The question stays pinned in both states
 * and the answer discloses below it via `grid-rows-[0fr] → [1fr]`, with
 * smooth `transition-[opacity,transform]` and no layout jump.
 */
export function StudyCard({
  card,
  sessionCounts,
  revealed,
  onToggleReveal,
  onRate,
  isRating,
  onEdit,
  onExam,
}: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const images = [card.image_url_1, card.image_url_2].filter(Boolean) as string[]

  return (
    <>
      {/* Session counts header */}
      <div className="mb-8 flex w-full max-w-[640px] flex-wrap items-center justify-center gap-4 rounded-2xl bg-surface-container-low px-6 py-2.5 sm:gap-8 sm:rounded-full">
        {RATINGS.map((r) => (
          <div key={r.key} className="flex items-center gap-1.5 sm:gap-2">
            <span aria-hidden className={cn("size-2 rounded-full", r.dot)} />
            <span className="text-body-md text-on-surface-variant">{r.label}</span>
            <span className="ml-1 text-body-md font-bold tabular">{sessionCounts[r.key]}</span>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-[640px] flex-col gap-6 sm:gap-8">
        <Surface ghost className="p-6 sm:p-10">
          <div className="flex justify-center">
            <Pill tone={stateTone(card)} size="sm">
              {card.state}
            </Pill>
          </div>

          <div className="flex w-full justify-center py-8">
            <div className="w-full max-w-[60ch] text-center">
              <MarkdownContent
                content={card.front}
                size="md"
                className="text-center text-body-lg sm:text-headline-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Auto-height disclosure with smooth opacity and transform transition */}
          <div
            data-open={revealed ? "" : undefined}
            className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out data-open:grid-rows-[1fr]"
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  "flex flex-col gap-6 transition-[opacity,transform] duration-200",
                  revealed
                    ? "opacity-100 motion-safe:translate-y-0"
                    : "opacity-0 motion-safe:translate-y-2"
                )}
              >
                {/* Tonal shift, not a 1px rule — DESIGN.md §2 */}
                <div className="rounded-xl bg-surface-container-low/70 p-5 sm:p-6 max-w-[60ch] mx-auto w-full">
                  <p className="mb-2 text-label-sm text-on-surface-variant uppercase font-semibold">Answer</p>
                  <MarkdownContent content={card.back} size="md" className="text-body-md leading-relaxed" />
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {images.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setLightbox(src)}
                        className="cursor-zoom-in overflow-hidden rounded-xl bg-surface-container-low focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Illustration ${i + 1} for: ${card.front.slice(0, 60)}`}
                          className="max-h-[40vh] w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8">
            {revealed ? (
              <RatingBar previews={card.previews} onRate={onRate} isRating={isRating} />
            ) : (
              <Button
                type="button"
                variant="tertiary"
                size="xl"
                onClick={onToggleReveal}
                className="w-full cursor-pointer font-semibold shadow-ambient"
              >
                Show answer
                <span className="ml-2 text-label-sm opacity-70">Space</span>
              </Button>
            )}
          </div>
        </Surface>

        <div className="flex flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="cursor-pointer">
              <Pencil className="size-4" />
              Edit card
            </Button>
            {revealed && (
              <Button variant="ghost" size="sm" onClick={onToggleReveal} className="cursor-pointer">
                <ChevronUp className="size-4" />
                Hide answer
              </Button>
            )}
          </div>

          {revealed && (
            <Button variant="ghost" size="sm" className="text-primary cursor-pointer" onClick={onExam}>
              <GraduationCap className="size-4" />
              Quiz me with AI
            </Button>
          )}
        </div>
      </div>

      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup className="max-w-3xl">
            <DialogTitle className="sr-only">Card illustration</DialogTitle>
            {lightbox && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox}
                alt={`Illustration for: ${card.front.slice(0, 60)}`}
                className="max-h-[80vh] w-full rounded-xl object-contain"
              />
            )}
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  )
}
