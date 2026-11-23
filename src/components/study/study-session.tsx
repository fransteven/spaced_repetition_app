"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Command } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { StudyCardItem } from "@/lib/services/study-service"
import type { FsrsRating } from "@/lib/fsrs/types"
import { previewIntervals } from "@/lib/fsrs/algorithm"
import { isBookDownloaded } from "@/lib/offline/book-files"
import { submitReviewOnlineOrQueue } from "@/lib/offline/persistence"
import { scheduleFromWire } from "@/lib/offline/schedule-wire"
import type { ScheduleWire } from "@/lib/offline/types"
import { useOnlineStatus } from "@/lib/offline/use-online-status"
import type { CardData } from "@/lib/validations"
import { CardEditor } from "@/components/cards/CardEditor"
import { ExamDialog } from "@/components/study/exam-dialog"
import { VoiceExamDialog } from "@/components/study/voice-exam-dialog"
import { StudyCard } from "@/components/study/study-card"
import { StudyOutcome } from "@/components/study/study-outcome"
import { useStudyHotkeys } from "@/hooks/use-study-hotkeys"

type SessionCounts = Record<FsrsRating, number>

/** One rating attempt; a retry of the same card reuses it so the server deduplicates it. */
interface ReviewAttempt {
  card_id: string
  client_review_id: string
  reviewed_at: string
}

interface Props {
  deckId: string
  deckName: string
  initialCards: StudyCardItem[]
  streakDays: number
  reviewedTodayBeforeSession: boolean
  /** Offline shell (downloaded deck). The session also behaves offline whenever the browser is. */
  offline?: boolean
}

/** Book ids (from card sources) whose EPUB is downloaded on this device. */
function useDownloadedBooks(cards: StudyCardItem[]): ReadonlySet<string> {
  const [downloaded, setDownloaded] = useState<ReadonlySet<string>>(() => new Set())
  const bookKey = [...new Set(cards.flatMap((c) => (c.source ? [c.source.book_id] : [])))].sort().join(",")
  useEffect(() => {
    if (!bookKey) return
    let cancelled = false
    const ids = bookKey.split(",")
    Promise.all(ids.map((id) => isBookDownloaded(id).catch(() => false)))
      .then((flags) => {
        if (!cancelled) setDownloaded(new Set(ids.filter((_, i) => flags[i])))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [bookKey])
  return downloaded
}

export function StudySession({
  deckId,
  deckName,
  initialCards,
  streakDays,
  reviewedTodayBeforeSession,
  offline: offlineProp = false,
}: Props) {
  const isOnline = useOnlineStatus()
  const offline = offlineProp || !isOnline
  const [cards, setCards] = useState<StudyCardItem[]>(initialCards)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [counts, setCounts] = useState<SessionCounts>({ again: 0, hard: 0, good: 0, easy: 0 })
  const [isPending, startTransition] = useTransition()
  const [rateError, setRateError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editCard, setEditCard] = useState<CardData | null>(null)
  const [examOpen, setExamOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)

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
  const attemptRef = useRef<ReviewAttempt | null>(null)
  const downloadedBooks = useDownloadedBooks(cards)

  // Server-only features are unmounted while offline (they would fail without a connection),
  // and closed for good so they do not pop back open when the connection returns.
  if (offline && (editorOpen || examOpen || voiceOpen)) {
    setEditorOpen(false)
    setExamOpen(false)
    setVoiceOpen(false)
  }
  const editorVisible = editorOpen && !offline
  const examVisible = examOpen && !offline
  const voiceVisible = voiceOpen && !offline

  let sourceHref: string | null = null
  if (currentCard?.source) {
    const { book_id, cfi_range } = currentCard.source
    const cfi = encodeURIComponent(cfi_range)
    if (!offline) sourceHref = `/read/${book_id}?cfi=${cfi}`
    else if (downloadedBooks.has(book_id)) sourceHref = `/offline/read?book=${encodeURIComponent(book_id)}&cfi=${cfi}`
  }

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

  // `schedule` is the card's new FSRS state (server answer or local review), when known: the
  // re-queued copy of an `again` card then shows fresh previews instead of the pre-review ones.
  const recordLocalReview = useCallback((rating: FsrsRating, schedule?: ScheduleWire | null) => {
    if (!currentCard) return
    setCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
    setElapsedMs(Date.now() - (startedAt.current ?? Date.now()))
    reviewedIds.current.add(currentCard.card_id)
    setReviewedCount(reviewedIds.current.size)
    const next = (reviewedIds.current.size / Math.max(1, sessionTotal)) * 100
    setProgressPct((prev) => Math.min(100, Math.max(prev, next)))
    if (rating === "again") {
      const copy: StudyCardItem = schedule
        ? {
            ...currentCard,
            stability: schedule.stability,
            state: schedule.state,
            previews: previewIntervals(scheduleFromWire(schedule), new Date()),
          }
        : { ...currentCard }
      setCards((prev) => [...prev, copy])
    }
    setCurrentIdx((prev) => prev + 1)
    setRevealed(false)
  }, [currentCard, sessionTotal])

  const handleRate = useCallback(async (rating: FsrsRating) => {
    if (!currentCard || isPending) return
    setRateError(null)
    let attempt = attemptRef.current
    if (!attempt || attempt.card_id !== currentCard.card_id) {
      attempt = {
        card_id: currentCard.card_id,
        client_review_id: crypto.randomUUID(),
        reviewed_at: new Date().toISOString(),
      }
      attemptRef.current = attempt
    }
    const input = { ...attempt, rating }
    startTransition(async () => {
      try {
        // Online: POST /api/study/review. Offline / network failure: FSRS runs locally on the
        // downloaded card and the review waits in the outbox (lib/offline/persistence.ts).
        const result = await submitReviewOnlineOrQueue(input)
        if (result.ok) {
          attemptRef.current = null
          recordLocalReview(rating, result.value.schedule)
        } else if (result.queued) {
          attemptRef.current = null
          recordLocalReview(rating, result.schedule)
        } else {
          setRateError(result.error.message || "Failed to submit review")
        }
      } catch (err) {
        console.error("[StudySession rating]", err)
        setRateError("An unexpected error occurred.")
      }
    })
  }, [currentCard, isPending, recordLocalReview])

  const toggleReveal = useCallback(() => setRevealed((prev) => !prev), [])

  // A card whose review keeps failing must not block the session: move on without
  // counting it as reviewed (its schedule is untouched, so it stays due).
  const skipCard = useCallback(() => {
    attemptRef.current = null
    setRateError(null)
    setRevealed(false)
    setCurrentIdx((prev) => prev + 1)
  }, [])

  useStudyHotkeys({
    revealed,
    disabled: isPending || examVisible || voiceVisible || editorVisible || done,
    onToggleReveal: toggleReveal,
    onRate: handleRate,
  })

  if (done) {
    return (
      <StudyOutcome
        variant="complete"
        deckId={deckId}
        deckName={deckName}
        offline={offline}
        stats={{
          recalled: counts.easy + counts.good,
          hard: counts.hard,
          again: counts.again,
          total: counts.again + counts.hard + counts.good + counts.easy,
          elapsedMs,
          successfulRecallCount: counts.easy + counts.good,
          streak: reviewedTodayBeforeSession ? streakDays : streakDays + 1,
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-8">
          {offline ? (
            <Link
              href="/offline"
              className="flex cursor-pointer items-center gap-2 text-on-surface-variant transition-colors hover:text-primary shrink-0"
            >
              <ArrowLeft className="size-4" />
              <span className="text-sm font-medium">Exit</span>
            </Link>
          ) : (
            <button
              onClick={() => window.history.back()}
              className="flex cursor-pointer items-center gap-2 text-on-surface-variant transition-colors hover:text-primary shrink-0"
            >
              <ArrowLeft className="size-4" />
              <span className="text-sm font-medium">Exit</span>
            </button>
          )}

          <h1 className="truncate max-w-[40vw] sm:max-w-xs text-headline-sm text-on-surface font-bold text-center px-2">
            {deckName}
          </h1>

          <span className="text-body-sm font-medium text-on-surface-variant tabular shrink-0">
            {reviewedCount} / {sessionTotal}
          </span>
        </div>

        {/* 2px thread — DESIGN.md §5 */}
        <div className="h-[2px] w-full overflow-hidden bg-surface-container-high">
          <div
            className={cn(
              "h-full bg-state-mastered transition-all duration-500",
              isPending && "animate-pulse"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </nav>

      <main className="flex flex-grow flex-col items-center px-4 py-6 sm:px-6 sm:py-8">
        {rateError && (
          <div
            role="alert"
            className="mb-4 flex w-full max-w-[640px] flex-wrap items-center justify-between gap-2 rounded-lg bg-error-container px-4 py-2 text-body-md text-on-error-container"
          >
            <p className="min-w-0 flex-1">{rateError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipCard}
              disabled={isPending}
              className="min-h-11 cursor-pointer text-on-error-container hover:bg-on-error-container/10 hover:text-on-error-container"
            >
              Skip card
            </Button>
          </div>
        )}

        <StudyCard
          card={currentCard!}
          sessionCounts={counts}
          revealed={revealed}
          onToggleReveal={toggleReveal}
          onRate={handleRate}
          isRating={isPending}
          onEdit={offline ? undefined : handleEditClick}
          onExam={offline ? undefined : () => setExamOpen(true)}
          onVoiceExam={offline ? undefined : () => setVoiceOpen(true)}
          sourceHref={sourceHref}
        />
      </main>

      <footer className="px-4 sm:px-8 pt-4 pb-10">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3 text-on-surface-variant/50">
          <div className="flex items-center gap-2">
            <Command className="size-4" />
            <span className="text-label-sm uppercase font-semibold">
              {revealed ? "Hotkeys: 1, 2, 3, 4 · Space to hide" : "Space to reveal"}
            </span>
          </div>
          <span className="text-label-sm uppercase font-semibold">
            {remaining} cards left
            {requeued > 0 && ` · ${requeued} to redo`}
          </span>
        </div>
      </footer>

      {!offline && (
        <CardEditor
          open={editorVisible}
          onOpenChange={setEditorOpen}
          deckId={deckId}
          initialValues={editCard ?? undefined}
          onSave={handleCardUpdate}
        />
      )}

      {currentCard && !offline && (
        <ExamDialog
          open={examVisible}
          onOpenChange={setExamOpen}
          cardId={currentCard.card_id}
          onVerdict={recordLocalReview}
        />
      )}
      {currentCard && !offline && (
        <VoiceExamDialog
          open={voiceVisible}
          onOpenChange={setVoiceOpen}
          cardId={currentCard.card_id}
          onReviewed={recordLocalReview}
        />
      )}
    </div>
  )
}
