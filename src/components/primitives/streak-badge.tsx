import React from "react"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StreakBadgeProps {
  days: number
  size?: "sm" | "md" | "lg"
  className?: string
  showMilestone?: boolean
}

export function StreakBadge({
  days,
  size = "md",
  className,
  showMilestone = true,
}: StreakBadgeProps): React.ReactElement {
  const milestoneText =
    days >= 100
      ? "100-day milestone"
      : days >= 30
        ? "30-day milestone"
        : days >= 7
          ? "7-day milestone"
          : null
  const isActive = days > 0

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-streak-container text-on-streak-container font-semibold",
        size === "sm" && "px-2.5 py-0.5 text-label-sm",
        size === "md" && "px-3.5 py-1 text-label-md",
        size === "lg" && "px-4 py-1.5 text-body-md",
        className
      )}
    >
      <Flame
        className={cn(
          "shrink-0 fill-current text-streak",
          size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4",
          isActive && "animate-streak"
        )}
      />
      <span className="tabular font-bold">
        {days} {days === 1 ? "day" : "days"}
      </span>
      {showMilestone && milestoneText && (
        <span className="rounded-full bg-streak/20 px-2 py-0.5 text-label-sm uppercase tracking-wider font-bold">
          {milestoneText}
        </span>
      )}
    </div>
  )
}
