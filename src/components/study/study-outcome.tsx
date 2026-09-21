"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, RotateCcw, Zap, Sparkles } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { StatCard } from "@/components/primitives/stat-card"
import { StreakBadge } from "@/components/primitives/streak-badge"
import { Surface } from "@/components/primitives/surface"
import { Pill } from "@/components/primitives/pill"

export interface StudyOutcomeStats {
  recalled: number
  hard: number
  again: number
  /** Total ratings submitted this session. */
  total: number
  /** Wall-clock milliseconds spent in the session. */
  elapsedMs: number
  /** Number of successful Good/Easy recall events in the session. */
  successfulRecallCount?: number
  /** User streak in days */
  streak?: number
}

interface Props {
  variant: "complete" | "caught-up"
  deckId: string
  deckName?: string
  stats?: StudyOutcomeStats
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

function AnimatedNumber({ value }: { value: number }): React.ReactElement {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (value === 0 || prefersReducedMotion) {
      const frameId = requestAnimationFrame(() => setCurrent(value))
      return () => cancelAnimationFrame(frameId)
    }

    let startTime: number | null = null
    let animId: number
    const duration = 600

    const step = (now: number) => {
      if (!startTime) startTime = now
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * value))

      if (progress < 1) {
        animId = requestAnimationFrame(step)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [value])

  return <span className="tabular">{current}</span>
}

export function StudyOutcome({ variant, deckId, deckName, stats }: Props): React.JSX.Element {
  if (variant === "caught-up") {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-8 text-center animate-rise-in">
        <div className="mx-auto max-w-md space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-state-mastered-container text-state-mastered">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-display-md text-on-surface">
              You&apos;re all caught up
            </h1>
            <p className="text-body-lg text-on-surface-variant">
              No cards due for review right now{deckName ? ` in "${deckName}"` : ""}. Your memory
              stability is on track.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/decks"
              className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
            >
              Explore other decks
            </Link>
            <Link
              href="/"
              className={buttonVariants({
                variant: "ghost",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const accuracy =
    stats && stats.total > 0 ? Math.round((stats.recalled / stats.total) * 100) : null

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-10 animate-rise-in">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center space-y-8 text-center">
        {/* Streak notification if present */}
        {stats?.streak !== undefined && stats.streak > 0 && (
          <div className="animate-pop-in">
            <StreakBadge days={stats.streak} size="lg" />
          </div>
        )}

        {/* Celebrated Title */}
        <div className="space-y-2">
          <h1 className="font-display text-display-md text-on-surface animate-celebrate">
            Session complete!
          </h1>
          {stats && (
            <p className="text-body-lg text-on-surface-variant">
              Great work! You reviewed {stats.total} {stats.total === 1 ? "card" : "cards"} in{" "}
              {formatElapsed(stats.elapsedMs)}.
            </p>
          )}
        </div>

        {/* 3 StatCards with state tones */}
        {stats && (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 text-left">
            <StatCard
              label="Recalled"
              value={<AnimatedNumber value={stats.recalled} />}
              tone="mastered"
              icon={<CheckCircle2 className="size-4" />}
              hint={accuracy !== null ? `${accuracy}% recall rate` : undefined}
            />
            <StatCard
              label="Hard"
              value={<AnimatedNumber value={stats.hard} />}
              tone="intermediate"
              icon={<Zap className="size-4" />}
              hint="Recalled with effort"
            />
            <StatCard
              label="Again"
              value={<AnimatedNumber value={stats.again} />}
              tone="struggling"
              icon={<RotateCcw className="size-4" />}
              hint="To review soon"
            />
          </div>
        )}

        {/* Memory progress reinforcement */}
        {stats?.successfulRecallCount !== undefined && stats.successfulRecallCount > 0 && (
          <Surface
            tone="panel"
            className="flex w-full items-center justify-between gap-4 p-4 sm:p-5 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-state-mastered-container text-on-state-mastered-container">
                <Sparkles className="size-5 text-state-mastered" />
              </div>
              <div>
                <p className="text-headline-sm font-semibold text-on-surface">
                  {stats.successfulRecallCount}{" "}
                  {stats.successfulRecallCount === 1 ? "successful recall" : "successful recalls"}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Rated Good or Easy during this session
                </p>
              </div>
            </div>
            <Pill tone="mastered" size="sm">
              FSRS 4.5
            </Pill>
          </Surface>
        )}

        {/* Actions */}
        <div className="flex w-full flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Link
            href="/decks"
            className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Another deck
          </Link>
          <Link
            href="/"
            className={buttonVariants({
              variant: "ghost",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            Return to dashboard
          </Link>
        </div>

        <Link
          href={`/decks/${deckId}`}
          className="text-body-sm text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4"
        >
          Back to {deckName || "deck"}
        </Link>
      </div>
    </div>
  )
}
