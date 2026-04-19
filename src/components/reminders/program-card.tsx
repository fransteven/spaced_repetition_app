import { BucketRow, Bucket } from "@/components/reminders/bucket-row"

export interface Session {
  date: string
  cards: number
}

export interface Program {
  id: string
  name: string
  deck: string
  status: "active" | "paused"
  buckets: Bucket[]
  sessions: Session[]
  lastEmail?: string
}

export function ProgramCard({
  program,
  onNewProgram,
}: {
  program: Program
  onNewProgram: () => void
}) {
  const isActive = program.status === "active"

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] border border-outline-variant/15 ${
        !isActive ? "opacity-70 grayscale-[0.4]" : ""
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold text-on-surface">{program.name}</h2>
            {isActive ? (
              <span className="bg-tertiary/10 text-tertiary text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Active
              </span>
            ) : (
              <span className="bg-surface-container-high text-on-surface-variant text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">style</span>
            Deck: {program.deck}
          </div>
        </div>
        <button className="p-1.5 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined text-xl">more_vert</span>
        </button>
      </div>

      {/* Buckets */}
      <div className="space-y-2 mb-5">
        {program.buckets.map((bucket) => (
          <BucketRow key={bucket.name} bucket={bucket} />
        ))}
      </div>

      {/* Upcoming sessions or empty state */}
      {program.sessions.length > 0 ? (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            Upcoming Sessions
          </p>
          <div className="flex gap-3 flex-wrap">
            {program.sessions.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2"
              >
                <span className="material-symbols-outlined text-primary text-base">event</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{s.date}</p>
                  <p className="text-[11px] text-on-surface-variant">{s.cards} cards</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-5 py-4 text-center">
          <p className="text-sm text-on-surface-variant italic">No sessions scheduled</p>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">Resume to restart scheduling</p>
          <button
            onClick={onNewProgram}
            className="mt-3 inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            Resume Now
          </button>
        </div>
      )}

      {/* Email footer */}
      {program.lastEmail && (
        <div className="flex items-center gap-2 pt-4 border-t border-outline-variant/10">
          <span className="material-symbols-outlined text-on-surface-variant text-base">mail</span>
          <p className="text-xs text-on-surface-variant">
            Reminder email sent on {program.lastEmail}
          </p>
        </div>
      )}
    </div>
  )
}
