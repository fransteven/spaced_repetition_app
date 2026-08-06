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

/**
 * One container that never unmounts. The question stays pinned in both states
 * and the answer discloses below it via `grid-rows-[0fr] → [1fr]`, so the card
 * grows from its real height with no fixed `min-h` and therefore no layout
 * jump. A 3D flip was rejected deliberately: it is the gamified tic DESIGN.md
 * §1 moves away from, and it would force a fixed height back in.
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
      {/* Session counts */}
      <div className="mb-8 flex w-full max-w-[640px] flex-wrap items-center justify-center gap-4 rounded-2xl bg-surface-container-low px-6 py-2.5 sm:gap-8 sm:rounded-full">
        {RATINGS.map((r) => (
          <div key={r.key} className="flex items-center gap-1.5 sm:gap-2">
            <span aria-hidden className={cn("h-2 w-2 rounded-full", r.dot)} />
            <span className="text-body-md text-on-surface-variant">{r.label}</span>
            <span className="ml-1 text-body-md font-bold">{sessionCounts[r.key]}</span>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-[640px] flex-col gap-6 sm:gap-8">
        <Surface ghost className="p-6 sm:p-10">
          <div className="flex justify-center">
            <Pill>{card.state}</Pill>
          </div>

          <div className="flex w-full justify-center py-8">
            <div className="w-full max-w-md text-center">
              <MarkdownContent content={card.front} size="md" className="text-center" />
            </div>
          </div>

          {/* Auto-height disclosure — no fixed height, no jump. */}
          <div
            data-open={revealed ? "" : undefined}
            className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out data-open:grid-rows-[1fr]"
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  "flex flex-col gap-6 transition-opacity duration-200",
                  revealed
                    ? "opacity-100 motion-safe:translate-y-0"
                    : "opacity-0 motion-safe:translate-y-2"
                )}
              >
                {/* Tonal shift, not a 1px rule — DESIGN.md §2 */}
                <div className="rounded-md bg-surface-container-low/70 p-5 sm:p-6">
                  <p className="mb-2 text-label-sm text-on-surface-variant uppercase">Answer</p>
                  <MarkdownContent content={card.back} size="md" />
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {images.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setLightbox(src)}
                        className="cursor-zoom-in overflow-hidden rounded-md bg-surface-container-low focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {/* object-contain: object-cover was center-cropping tall diagrams.
                            The grayscale-until-hover treatment was removed — touch
                            devices have no hover, so images stayed desaturated. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Illustration ${i + 1} for: ${card.front.slice(0, 60)}`}
                          className="max-h-[300px] w-full object-contain"
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
              // Tertiary is the prescribed "Answer" button — DESIGN.md §5
              <Button
                type="button"
                variant="tertiary"
                size="xl"
                onClick={onToggleReveal}
                className="w-full"
              >
                Show answer
                <span className="ml-2 text-label-sm opacity-60">Space</span>
              </Button>
            )}
          </div>
        </Surface>

        <div className="flex flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit card
            </Button>
            {revealed && (
              <Button variant="ghost" size="sm" onClick={onToggleReveal}>
                <ChevronUp className="h-4 w-4" />
                Hide answer
              </Button>
            )}
          </div>

          {revealed && (
            <Button variant="ghost" size="sm" className="text-primary" onClick={onExam}>
              <GraduationCap className="h-4 w-4" />
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
                className="max-h-[80vh] w-full rounded-md object-contain"
              />
            )}
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  )
}
