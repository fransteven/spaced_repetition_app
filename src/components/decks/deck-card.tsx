"use client"

export type DeckState = "study" | "review" | "mastered"

export interface DeckData {
  id: string
  category: string
  categoryColor: "primary" | "tertiary"
  title: string
  verified?: boolean
  totalCards: string
  due: number
  fullyMastered?: boolean
  mastery: number
  stats: { due: number; learning: number; mastered: number }
  lastStudied: string
  state: DeckState
}

interface DeckCardProps extends DeckData {
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
}

export function DeckCard({
  category,
  categoryColor,
  title,
  verified,
  totalCards,
  due,
  fullyMastered,
  mastery,
  stats,
  lastStudied,
  state,
  menuOpen,
  onMenuToggle,
  onMenuClose,
}: DeckCardProps) {
  const categoryClass =
    categoryColor === "tertiary"
      ? "bg-tertiary/10 text-tertiary"
      : "bg-surface-container-low text-primary"

  return (
    <div className="group bg-surface-container-lowest p-6 rounded-xl relative transition-all hover:shadow-[0px_12px_32px_rgba(25,28,29,0.04)] border border-outline-variant/5 flex flex-col justify-between overflow-hidden">
      {/* Mastery decorative glow */}
      {state === "mastered" && (
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-tertiary/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div>
        {/* Category + menu */}
        <div className="flex justify-between items-start mb-4">
          <span
            className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full ${categoryClass}`}
          >
            {category}
          </span>

          <div className="relative">
            <button
              onClick={onMenuToggle}
              className={`p-1 rounded transition-colors ${
                menuOpen
                  ? "bg-surface-container-high text-primary"
                  : "hover:bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">more_horiz</span>
            </button>

            {menuOpen && (
              <>
                {/* Backdrop to close */}
                <div className="fixed inset-0 z-10" onClick={onMenuClose} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/10 z-20 py-2 overflow-hidden">
                  <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">edit</span>
                    Edit deck
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Add cards
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">ios_share</span>
                    Export
                  </button>
                  <hr className="my-1 border-outline-variant/10" />
                  <button className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">delete</span>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-on-surface mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
          {title}
          {verified && (
            <span
              className="material-symbols-outlined text-tertiary text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          )}
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-on-surface-variant mb-6">
          {totalCards} cards ·{" "}
          {fullyMastered ? (
            <span className="text-tertiary font-semibold uppercase tracking-tighter text-[10px]">
              Fully Mastered
            </span>
          ) : due > 0 ? (
            <span className="text-error font-semibold">{due} due</span>
          ) : (
            <span className="italic">0 due</span>
          )}
        </p>

        {/* Mastery bar + legend */}
        <div className="space-y-4 mb-8">
          <div>
            <div className="flex justify-between text-[10px] text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">
              <span>Mastery Progress</span>
              <span>{mastery}%</span>
            </div>
            <div className="h-0.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-tertiary" style={{ width: `${mastery}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {state === "mastered" ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-tertiary" />
                <span className="text-[10px] font-medium text-on-surface-variant">
                  {stats.mastered}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-error" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.due}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.learning}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-tertiary" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.mastered}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-on-surface-variant italic">
          Last studied {lastStudied}
        </span>

        {state === "study" && (
          <button className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded hover:opacity-90 transition-all flex items-center gap-2">
            Study now
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
        {state === "review" && (
          <button className="bg-primary/10 text-primary text-xs font-bold px-4 py-2 rounded hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2">
            Review
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        )}
        {state === "mastered" && (
          <button className="bg-surface-container-low text-on-surface-variant text-xs font-bold px-4 py-2 rounded hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2">
            Refresh
            <span className="material-symbols-outlined text-sm">restart_alt</span>
          </button>
        )}
      </div>
    </div>
  )
}
