import React from "react"
import { cn } from "@/lib/utils"

export interface MasteryThreadProps {
  /** Percentage completed, 0-100 */
  value: number
  tone?: "mastered" | "primary" | "streak" | "intermediate" | "struggling"
  animate?: boolean
  className?: string
}

const FILL_COLORS = {
  mastered: "bg-state-mastered",
  primary: "bg-primary",
  streak: "bg-streak",
  intermediate: "bg-state-intermediate",
  struggling: "bg-state-struggling",
}

export function MasteryThread({
  value,
  tone = "mastered",
  animate = true,
  className,
}: MasteryThreadProps): React.ReactElement {
  const clamped = Math.min(100, Math.max(0, value))
  const fillColor = FILL_COLORS[tone] ?? FILL_COLORS.mastered

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-0.5 w-full overflow-hidden rounded-full bg-surface-container-high", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-[var(--duration-slow)]",
          fillColor,
          animate && "origin-left animate-thread"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
