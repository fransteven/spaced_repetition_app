"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { StudyCardItem } from "@/lib/services/study-service"
import type { FsrsRating } from "@/lib/fsrs/types"
import { QuestionView } from "./question-view"
import { AnswerView } from "./answer-view"

type SessionCounts = Record<FsrsRating, number>

interface Props {
  deckId:       string
  deckName:     string
  initialCards: StudyCardItem[]
}

export function StudySession({ deckId, deckName, initialCards }: Props) {
  const [cards,      setCards]      = useState<StudyCardItem[]>(initialCards)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [view,       setView]       = useState<"question" | "answer">("question")
  const [counts,     setCounts]     = useState<SessionCounts>({ again: 0, hard: 0, good: 0, easy: 0 })
  const [isRating,   setIsRating]   = useState(false)
  const [rateError,  setRateError]  = useState<string | null>(null)

  const total       = cards.length
  const done        = currentIdx >= total
  const currentCard = done ? null : cards[currentIdx]
  const remaining   = Math.max(0, total - currentIdx - 1)
  const progressPct = total > 0 ? (currentIdx / total) * 100 : 0

  const handleRate = useCallback(async (rating: FsrsRating) => {
    if (!currentCard || isRating) return
    setIsRating(true)
    setRateError(null)

    try {
      const res  = await fetch("/api/study/review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ card_id: currentCard.card_id, rating }),
      })
      const json = await res.json()

      if (!res.ok) {
        setRateError(json?.error?.message ?? "Failed to submit review")
        return
      }

      setCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }))

      if (rating === "again") {
        // Append card to queue end for same-session re-review
        setCards(prev => [...prev, { ...currentCard }])
      }

      setCurrentIdx(prev => prev + 1)
      setView("question")
    } finally {
      setIsRating(false)
    }
  }, [currentCard, isRating])

  // Keyboard shortcuts 1–4 → Again/Hard/Good/Easy
  useEffect(() => {
    if (view !== "answer" || isRating) return
    const RATING_KEYS: Record<string, FsrsRating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" }
    const handler = (e: KeyboardEvent) => {
      const r = RATING_KEYS[e.key]
      if (r) handleRate(r)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [view, isRating, handleRate])

  if (done) {
    const recalled = counts.easy + counts.good
    return (
      <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center justify-center gap-8 px-6">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-tertiary">check_circle</span>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Session complete</h1>
          <p className="text-on-surface-variant text-sm">
            {recalled} recalled &nbsp;·&nbsp; {counts.hard} hard &nbsp;·&nbsp; {counts.again} missed
          </p>
        </div>
        <Link
          href={`/decks/${deckId}`}
          className="px-6 py-3 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary-container transition-colors"
        >
          Back to deck
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-[12px]">
        <div className="relative flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-medium">Exit</span>
          </button>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-primary tracking-tight">
            {deckName}
          </h1>

          <span className="text-on-surface-variant font-medium text-sm">
            {view === "question"
              ? `Deck Progress: ${currentIdx + 1} / ${total} cards`
              : `Deck Progress: ${Math.round(progressPct)}%`}
          </span>
        </div>

        <div className="w-full h-[2px] bg-surface-container-high overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${view === "question" ? "bg-primary" : "bg-tertiary"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </nav>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center px-6 py-8">
        {rateError && (
          <p className="mb-4 text-sm text-error bg-error-container px-4 py-2 rounded-lg">{rateError}</p>
        )}
        {view === "question" ? (
          <QuestionView
            card={currentCard!}
            sessionCounts={counts}
            onShowAnswer={() => setView("answer")}
          />
        ) : (
          <AnswerView
            card={currentCard!}
            onRate={handleRate}
            isRating={isRating}
          />
        )}
      </main>

      {/* Footer */}
      {view === "answer" ? (
        <footer className="pb-10 pt-4">
          <div className="max-w-screen-2xl mx-auto px-8 flex justify-between items-center text-on-surface-variant/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">keyboard_command_key</span>
              <span className="text-[11px] font-medium tracking-wider uppercase">
                Hotkeys: 1, 2, 3, 4
              </span>
            </div>
            <span className="text-[11px] font-medium tracking-wider uppercase">
              Session: {remaining} Cards Remaining
            </span>
          </div>
        </footer>
      ) : (
        <footer className="py-8 flex justify-center opacity-30 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-tighter">THE COGNITIVE ATELIER</span>
            <span className="w-1 h-1 bg-on-surface rounded-full" />
            <span className="text-xs font-medium">EST 2024</span>
          </div>
        </footer>
      )}
    </div>
  )
}
