"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { ArrowLeft, Command } from "lucide-react"

import { cn } from "@/lib/utils"
import type { StudyCardItem } from "@/lib/services/study-service"
import type { FsrsRating } from "@/lib/fsrs/types"
import type { CardData } from "@/lib/validations"
import { CardEditor } from "@/components/cards/CardEditor"
import { ExamDialog } from "@/components/study/exam-dialog"
import { StudyCard } from "@/components/study/study-card"
import { StudyOutcome } from "@/components/study/study-outcome"
import { unwrapError } from "@/lib/api-envelope"
import { useStudyHotkeys } from "@/hooks/use-study-hotkeys"

type SessionCounts = Record<FsrsRating, number>

interface Props {
  deckId: string
  deckName: string
  initialCards: StudyCardItem[]
}

export function StudySession({ deckId, deckName, initialCards }: Props) {
  const [cards, setCards] = useState<StudyCardItem[]>(initialCards)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [counts, setCounts] = useState<SessionCounts>({ again: 0, hard: 0, good: 0, easy: 0 })
  const [isPending, startTransition] = useTransition()
  const [rateError, setRateError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editCard, setEditCard] = useState<CardData | null>(null)
  const [examOpen, setExamOpen] = useState(false)

  // Progress denominators are frozen at mount. `again` cards get re-appended to
  // `cards`, so a denominator of `cards.length` grows mid-session and makes the
  // bar visually regress.
  const [sessionTotal] = useState(initialCards.length)
  const reviewedIds = useRef<Set<string>>(new Set())
  const [reviewedCount, setReviewedCount] = useState(0)
  const [progressPct, setProgressPct] = useState(0)

  // Clock reads stay out of render: the ref is stamped on mount and elapsed
  // time is recomputed inside the rating handler.
  const startedAt = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  const total = cards.length
  const done = currentIdx >= total
  const currentCard = done ? null : cards[currentIdx]
  const remaining = Math.max(0, total - currentIdx - 1)
  const requeued = Math.max(0, total - sessionTotal)

  const handleEditClick = () => {
    if (!currentCard) return
    setEditCard({
      id: currentCard.card_id,
      front: currentCard.front,
      back: currentCard.back,
      image_url_1: currentCard.image_url_1,
      image_url_2: currentCard.image_url_2,
      tags: [],
    })
    setEditorOpen(true)
  }

  const handleCardUpdate = (updatedCard: {
    id: string
    front: string
    back: string
    image_url_1: string | null
    image_url_2: string | null
    tags: string[] | null
  }) => {
    setCards((prev) =>
      prev.map((c) =>
        c.card_id === updatedCard.id
          ? {
              ...c,
              front: updatedCard.front,
              back: updatedCard.back,
              image_url_1: updatedCard.image_url_1,
              image_url_2: updatedCard.image_url_2,
            }
          : c
      )
    )
  }

  const handleRate = useCallback(
    async (rating: FsrsRating) => {
      if (!currentCard || isPending) return
      setRateError(null)

      startTransition(async () => {
        try {
          const res = await fetch("/api/study/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ card_id: currentCard.card_id, rating }),
          })
          const json: unknown = await res.json()

          if (!res.ok) {
            setRateError(unwrapError(json, "Failed to submit review"))
            return
          }

          setCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
          setElapsedMs(Date.now() - (startedAt.current ?? Date.now()))

          reviewedIds.current.add(currentCard.card_id)
          setReviewedCount(reviewedIds.current.size)
          const next = (reviewedIds.current.size / Math.max(1, sessionTotal)) * 100
          // Monotonic by construction — the bar can only ever move forward.
          setProgressPct((prev) => Math.min(100, Math.max(prev, next)))

          if (rating === "again") {
            // Re-queue for a second pass in this same session.
            setCards((prev) => [...prev, { ...currentCard }])
          }

          setCurrentIdx((prev) => prev + 1)
          setRevealed(false)
        } catch (err) {
          console.error("[StudySession rating]", err)
          setRateError("An unexpected error occurred.")
        }
      })
    },
    [currentCard, isPending, sessionTotal]
  )

  const toggleReveal = useCallback(() => setRevealed((prev) => !prev), [])

  useStudyHotkeys({
    revealed,
    disabled: isPending || examOpen || editorOpen || done,
    onToggleReveal: toggleReveal,
    onRate: handleRate,
  })

  if (done) {
    return (
      <StudyOutcome
        variant="complete"
        deckId={deckId}
        stats={{
          recalled: counts.easy + counts.good,
          hard: counts.hard,
          again: counts.again,
          total: counts.again + counts.hard + counts.good + counts.easy,
          elapsedMs,
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-[12px]">
        <div className="relative mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-8">
          <button
            onClick={() => window.history.back()}
            className="flex cursor-pointer items-center gap-2 text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Exit</span>
          </button>

          <h1 className="absolute left-1/2 max-w-[150px] -translate-x-1/2 truncate text-headline-sm text-primary sm:max-w-xs">
            {deckName}
          </h1>

          <span className="text-body-sm font-medium text-on-surface-variant">
            {reviewedCount} / {sessionTotal}
          </span>
        </div>

        {/* 2px thread — DESIGN.md §5 */}
        <div className="h-[2px] w-full overflow-hidden bg-surface-container-high">
          <div
            className={cn(
              "h-full bg-tertiary transition-all duration-500",
              isPending && "animate-pulse"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </nav>

      <main className="flex flex-grow flex-col items-center px-4 py-6 sm:px-6 sm:py-8">
        {rateError && (
          <p className="mb-4 rounded-lg bg-error-container px-4 py-2 text-body-md text-on-error-container">
            {rateError}
          </p>
        )}

        <StudyCard
          card={currentCard!}
          sessionCounts={counts}
          revealed={revealed}
          onToggleReveal={toggleReveal}
          onRate={handleRate}
          isRating={isPending}
          onEdit={handleEditClick}
          onExam={() => setExamOpen(true)}
        />
      </main>

      <footer className="px-8 pt-4 pb-10">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between text-on-surface-variant/40">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4" />
            <span className="text-label-sm uppercase">
              {revealed ? "Hotkeys: 1, 2, 3, 4 · Space to hide" : "Space to reveal"}
            </span>
          </div>
          <span className="text-label-sm uppercase">
            {remaining} cards left
            {requeued > 0 && ` · ${requeued} to redo`}
          </span>
        </div>
      </footer>

      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        deckId={deckId}
        initialValues={editCard ?? undefined}
        onSave={handleCardUpdate}
      />

      {currentCard && (
        <ExamDialog
          open={examOpen}
          onOpenChange={setExamOpen}
          cardId={currentCard.card_id}
          onVerdict={handleRate}
        />
      )}
    </div>
  )
}
