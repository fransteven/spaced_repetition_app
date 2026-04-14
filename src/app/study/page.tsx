"use client"

import { useState } from "react"

// ── Types & data ────────────────────────────────────────────────────────────────

type StudyView = "question" | "answer"

const CARD = {
  deck: "Phrasal Verbs",
  type: "Phrasal Verb",
  question: "What does 'give up' mean and how is it used?",
  term: "give up",
  answer: "To stop doing something / to surrender.",
  example: '"She gave up smoking last year."',
  current: 8,
  total: 24,
  lastReviewed: "2d ago",
}

const SESSION = { again: 2, hard: 1, good: 4, easy: 1, remaining: 42 }

interface Rating {
  label: string
  interval: string
  active: string  // active/default bg+text
  idle: string    // for stats dot
}

const RATINGS: Rating[] = [
  {
    label: "Again",
    interval: "< 1 min",
    active: "bg-error text-on-error",
    idle: "bg-error",
  },
  {
    label: "Hard",
    interval: "1 day",
    active: "border-2 border-outline text-outline bg-surface-container-lowest",
    idle: "bg-secondary",
  },
  {
    label: "Good",
    interval: "4 days",
    active: "bg-primary-container text-on-primary shadow-md shadow-primary/20",
    idle: "bg-primary",
  },
  {
    label: "Easy",
    interval: "12 days",
    active: "bg-tertiary text-on-tertiary",
    idle: "bg-tertiary",
  },
]

const SESSION_COUNTS = [SESSION.again, SESSION.hard, SESSION.good, SESSION.easy]

// ── Question view ───────────────────────────────────────────────────────────────

function QuestionView({ onShowAnswer }: { onShowAnswer: () => void }) {
  return (
    <>
      {/* Stats pill */}
      <div className="flex items-center gap-8 mb-12 py-2 px-6 bg-surface-container-low rounded-full">
        {RATINGS.map((r, i) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${r.idle}`} />
            <span className="text-sm font-medium text-on-surface-variant">{r.label}</span>
            <span className="text-sm font-bold ml-1">{SESSION_COUNTS[i]}</span>
          </div>
        ))}
      </div>

      {/* Card + actions */}
      <div className="w-full max-w-[640px] flex flex-col gap-8">
        {/* Question card */}
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] min-h-[420px] flex flex-col items-center justify-between border border-outline-variant/15">
          {/* Type pill */}
          <div className="w-full flex justify-center">
            <span className="px-4 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-xs font-semibold tracking-wider uppercase">
              {CARD.type}
            </span>
          </div>

          {/* Question */}
          <div className="flex-grow flex items-center justify-center py-8">
            <h2 className="text-2xl font-semibold text-center text-on-surface leading-snug max-w-md">
              {CARD.question}
            </h2>
          </div>

          {/* CTA */}
          <div className="w-full pt-8">
            <button
              onClick={onShowAnswer}
              className="w-full py-5 bg-primary text-on-primary rounded-lg font-bold text-lg hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/10"
            >
              Show Answer
            </button>
          </div>
        </div>

        {/* Edit / Flag / Meta */}
        <div className="flex justify-between items-center px-4">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">edit</span>
              <span className="text-sm font-medium">Edit Card</span>
            </button>
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">flag</span>
              <span className="text-sm font-medium">Flag</span>
            </button>
          </div>
          <span className="text-on-surface-variant text-xs italic opacity-60">
            Last reviewed {CARD.lastReviewed}
          </span>
        </div>
      </div>

      {/* Decorative editorial watermark */}
      <div className="fixed bottom-12 left-12 pointer-events-none opacity-[0.03] select-none hidden lg:block">
        <h3 className="text-9xl font-black italic">COLLECTION 04</h3>
      </div>
    </>
  )
}

// ── Answer view ─────────────────────────────────────────────────────────────────

function AnswerView({ onRate }: { onRate: (rating: string) => void }) {
  return (
    <div className="w-full max-w-[640px] flex flex-col gap-8">
      {/* Answer card */}
      <section
        className="bg-surface-container-lowest rounded-xl p-8 lg:p-12 border border-outline-variant/15"
        style={{ boxShadow: "0px 12px 32px rgba(25, 28, 29, 0.04)" }}
      >
        <div className="flex flex-col gap-6">
          {/* Original term */}
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
              {CARD.type}
            </span>
            <h2 className="text-base text-on-surface-variant mt-2">{CARD.term}</h2>
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-container-high w-full" />

          {/* Answer */}
          <div className="space-y-4">
            <p className="text-xl font-medium leading-relaxed text-on-surface">
              {CARD.answer}
            </p>
            <p className="text-lg italic text-on-surface-variant/80">{CARD.example}</p>
          </div>

          {/* Contextual images */}
          <div className="flex gap-4 pt-4">
            {[
              {
                src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAqyDGDBYkJ8ybTtcDEfbPXYpPogF7-GV8xUnglpUlSvjcP0d16tctWel8ezTICodwYeX2XdVDfxTUAVdo39s1F4cpoeQ7k-zEsgfheXhiMnSjR7VkArogDA17DK1JAQexoaR39EWktrTGQI8ikuV09T3NffsxeP2ia0gHUdNCkSP4HP-vplLP1qBHStkT78SjI7EQTWrUyjLncdCNsYWGZkd2oUR1CKynd_YdM5KnOTGasL0XPgGxrOK2oriZol6mcM_zqP4Q08Xon",
                alt: "Discarded cigarettes on white table — giving up smoking",
              },
              {
                src: "https://lh3.googleusercontent.com/aida-public/AB6AXuACle6lne2LCS43JqYVvRVxesoOZtLeVGF2oMqujeJsR40Q81-93uLZUdCj9VFDH6JxHecQYollV_P0sJ3cPGD9ed5U9PG9kDCjCHYLPNIi_zx-LotFhKvbFgiSEU3VRbK1rrOvwCtOZpEPWeSJjwjZJJBms2Nq10KYck6TT2GEHgYZXBqszaPdgUVG-vqQMUTB-h9zNSpU4GK6xywAAgbHa1Q8zby1Rp7qSZk1mV0H4xAGptlmB-qH2BJP5GngrIQL51mtEnxFLN2X",
                alt: "Person with hands raised — surrendering, letting go",
              },
            ].map((img) => (
              <div
                key={img.alt}
                className="relative flex-1 aspect-[4/3] bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant/10 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                />
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold bg-surface-container-lowest/80 px-2 py-1 rounded whitespace-nowrap">
                  contextual image
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rating controls */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3">
          {RATINGS.map((r) => (
            <button
              key={r.label}
              onClick={() => onRate(r.label)}
              className={`h-12 flex items-center justify-center rounded-lg font-semibold transition-transform active:scale-95 shadow-sm ${r.active}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Interval hints */}
        <div className="flex justify-between px-2">
          {RATINGS.map((r) => (
            <div key={r.label} className="text-xs text-on-surface-variant text-center flex-1">
              <span className="block font-medium">{r.interval}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-on-surface-variant/60 italic mt-2">
          Select a rating to schedule next review
        </p>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

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
