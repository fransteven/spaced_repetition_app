"use client"

import type { StudyCardItem } from "@/lib/services/study-service"
import type { FsrsRating } from "@/lib/fsrs/types"

export interface Rating {
  label:  string
  active: string
  idle:   string
}

export const RATINGS: Rating[] = [
  {
    label:  "Again",
    active: "bg-error text-on-error",
    idle:   "bg-error",
  },
  {
    label:  "Hard",
    active: "border-2 border-outline text-outline bg-surface-container-lowest",
    idle:   "bg-secondary",
  },
  {
    label:  "Good",
    active: "bg-primary-container text-on-primary shadow-md shadow-primary/20",
    idle:   "bg-primary",
  },
  {
    label:  "Easy",
    active: "bg-tertiary text-on-tertiary",
    idle:   "bg-tertiary",
  },
]

type SessionCounts = Record<FsrsRating, number>

interface Props {
  card:          StudyCardItem
  sessionCounts: SessionCounts
  onShowAnswer:  () => void
}

export function QuestionView({ card, sessionCounts, onShowAnswer }: Props) {
  return (
    <>
      {/* Stats pill */}
      <div className="flex items-center gap-8 mb-12 py-2 px-6 bg-surface-container-low rounded-full">
        {RATINGS.map(r => {
          const key = r.label.toLowerCase() as FsrsRating
          return (
            <div key={r.label} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${r.idle}`} />
              <span className="text-sm font-medium text-on-surface-variant">{r.label}</span>
              <span className="text-sm font-bold ml-1">{sessionCounts[key]}</span>
            </div>
          )
        })}
      </div>

      {/* Card + actions */}
      <div className="w-full max-w-[640px] flex flex-col gap-8">
        {/* Question card */}
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] min-h-[420px] flex flex-col items-center justify-between border border-outline-variant/15">
          {/* State pill */}
          <div className="w-full flex justify-center">
            <span className="px-4 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-xs font-semibold tracking-wider uppercase">
              {card.state}
            </span>
          </div>

          {/* Question */}
          <div className="flex-grow flex items-center justify-center py-8">
            <h2 className="text-2xl font-semibold text-center text-on-surface leading-snug max-w-md">
              {card.front}
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

        {/* Edit / Flag */}
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
        </div>
      </div>

      {/* Decorative watermark */}
      <div className="fixed bottom-12 left-12 pointer-events-none opacity-[0.03] select-none hidden lg:block">
        <h3 className="text-9xl font-black italic">COLLECTION 04</h3>
      </div>
    </>
  )
}
