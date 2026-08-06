import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export interface StudyOutcomeStats {
  recalled: number
  hard: number
  again: number
  /** Total ratings submitted this session. */
  total: number
  /** Wall-clock milliseconds spent in the session. */
  elapsedMs: number
}

interface Props {
  variant: "complete" | "caught-up"
  deckId: string
  stats?: StudyOutcomeStats
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

/**
 * Shared terminal screen. The session-complete block and the "nothing due"
 * block were near-duplicates, both at `text-3xl font-bold` where DESIGN.md §6
 * asks for `display-sm`.
 */
export function StudyOutcome({ variant, deckId, stats }: Props): React.JSX.Element {
  const accuracy =
    stats && stats.total > 0 ? Math.round((stats.recalled / stats.total) * 100) : null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface px-6 text-on-surface">
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-tertiary" />
        <h1 className="text-display-sm text-on-surface">
          {variant === "complete" ? "Session complete" : "You're all caught up"}
        </h1>

        {variant === "complete" && stats ? (
          <div className="space-y-2">
            <p className="text-body-lg text-on-surface-variant">
              {stats.recalled} recalled &nbsp;·&nbsp; {stats.hard} hard &nbsp;·&nbsp; {stats.again}{" "}
              missed
            </p>
            <p className="text-label-md text-on-surface-variant uppercase">
              {accuracy !== null ? `${accuracy}% recall` : "No ratings"} &nbsp;·&nbsp;{" "}
              {formatElapsed(stats.elapsedMs)}
            </p>
          </div>
        ) : (
          <p className="text-body-lg text-on-surface-variant">
            No cards due for review right now. Come back later.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={`/decks/${deckId}`} className={buttonVariants({ size: "lg" })}>
          Back to deck
        </Link>
        {variant === "complete" && (
          <Link
            href={`/study/${deckId}`}
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Study again
          </Link>
        )}
      </div>
    </div>
  )
}
