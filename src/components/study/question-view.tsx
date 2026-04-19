"use client"

export const CARD = {
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

export const SESSION = { again: 2, hard: 1, good: 4, easy: 1, remaining: 42 }
const SESSION_COUNTS = [SESSION.again, SESSION.hard, SESSION.good, SESSION.easy]

export interface Rating {
  label: string
  interval: string
  active: string  // active/default bg+text
  idle: string    // for stats dot
}

export const RATINGS: Rating[] = [
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

export function QuestionView({ onShowAnswer }: { onShowAnswer: () => void }) {
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
