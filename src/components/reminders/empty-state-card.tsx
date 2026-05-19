"use client"

export function EmptyStateCard({ onNewProgram }: { onNewProgram: () => void }) {
  return (
    <div className="border-2 border-dashed border-outline-variant/40 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-4">
      <div className="bg-surface-container-low rounded-full p-3">
        <span className="material-symbols-outlined text-primary text-3xl">add_circle</span>
      </div>
      <div>
        <p className="text-base font-semibold text-on-surface mb-1">Start a new program</p>
        <p className="text-sm text-on-surface-variant max-w-sm leading-relaxed">
          Connect a deck to start scheduling reviews. We&apos;ll automatically create a Google
          Calendar schedule based on your mastery levels.
        </p>
      </div>
      <button
        onClick={onNewProgram}
        className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-all"
      >
        <span className="material-symbols-outlined text-base">add</span>
        New Program
      </button>
    </div>
  )
}
