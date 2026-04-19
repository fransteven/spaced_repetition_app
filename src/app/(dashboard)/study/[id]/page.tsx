"use client"

import { useState } from "react"
import { QuestionView, CARD, SESSION } from "@/components/study/question-view"
import { AnswerView } from "@/components/study/answer-view"

type StudyView = "question" | "answer"

export default function StudyPage() {
  const [view, setView] = useState<StudyView>("question")

  const progressPct =
    view === "question"
      ? (CARD.current / CARD.total) * 100
      : 85

  const progressColor = view === "question" ? "bg-primary" : "bg-tertiary"

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
            {CARD.deck}
          </h1>

          <span className="text-on-surface-variant font-medium text-sm">
            {view === "question"
              ? `Deck Progress: ${CARD.current} / ${CARD.total} cards`
              : `Deck Progress: ${progressPct}%`}
          </span>
        </div>

        {/* Mastery thread progress bar */}
        <div className="w-full h-[2px] bg-surface-container-high overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-500`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center px-6 py-8">
        {view === "question" ? (
          <QuestionView onShowAnswer={() => setView("answer")} />
        ) : (
          <AnswerView onRate={() => setView("question")} />
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
              Session: {SESSION.remaining} Cards Remaining
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
