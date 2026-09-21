import React from "react"
import { Surface } from "@/components/primitives/surface"
import { cn } from "@/lib/utils"

export type StatTone = "struggling" | "intermediate" | "mastered" | "streak" | "primary" | "neutral"

export interface StatCardProps {
  label: string
  value: React.ReactNode
  tone?: StatTone
  icon?: React.ReactNode
  hint?: React.ReactNode
  trend?: React.ReactNode
  className?: string
  interactive?: boolean
}

const TONE_VALUE_COLORS: Record<StatTone, string> = {
  struggling: "text-state-struggling",
  intermediate: "text-state-intermediate",
  mastered: "text-state-mastered",
  streak: "text-streak",
  primary: "text-primary",
  neutral: "text-on-surface",
}

export function StatCard({
  label,
  value,
  tone = "neutral",
  icon,
  hint,
  trend,
  className,
  interactive = false,
}: StatCardProps): React.ReactElement {
  const valueColor = TONE_VALUE_COLORS[tone] ?? TONE_VALUE_COLORS.neutral

  return (
    <Surface
      tone="stat"
      interactive={interactive}
      className={cn("flex flex-col gap-1.5 animate-rise-in", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
          {label}
        </span>
        {icon && <span className="text-on-surface-variant/80 shrink-0">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span className={cn("text-metric-lg tabular tracking-tight", valueColor)}>
          {value}
        </span>
        {trend && <span className="text-label-md text-on-surface-variant">{trend}</span>}
      </div>

      {hint && (
        <span className="text-body-sm text-on-surface-variant mt-0.5">
          {hint}
        </span>
      )}
    </Surface>
  )
}
