import React from "react"
import type { HeatmapDay } from "@/lib/services/dashboard-service"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

export const HEATMAP_SCALE = [
  { level: 0, class: "bg-surface-container-high" },
  { level: 10, class: "bg-state-mastered/20" },
  { level: 20, class: "bg-state-mastered/35" },
  { level: 30, class: "bg-state-mastered/50" },
  { level: 40, class: "bg-state-mastered/65" },
  { level: 60, class: "bg-state-mastered/80" },
  { level: 90, class: "bg-state-mastered" },
]

function getHeatmapClass(level: number): string {
  if (level === 0) return HEATMAP_SCALE[0].class
  for (let i = HEATMAP_SCALE.length - 1; i >= 0; i--) {
    if (level >= HEATMAP_SCALE[i].level) return HEATMAP_SCALE[i].class
  }
  return HEATMAP_SCALE[1].class
}

export function ActivityHeatmap({ cells }: { cells: HeatmapDay[] }) {
  const totalReviews = cells.reduce((acc, c) => acc + c.count, 0)

  let leadingEmptyCells = 0
  if (cells[0]?.date) {
    try {
      const firstDay = parseISO(cells[0].date).getDay()
      leadingEmptyCells = (firstDay + 6) % 7
    } catch {
      leadingEmptyCells = 0
    }
  }

  const gridCells: Array<HeatmapDay | null> = [
    ...Array.from({ length: leadingEmptyCells }, () => null),
    ...cells,
  ]

  // Generate month headers from weekly column markers
  const weekCount = Math.ceil(gridCells.length / 7)
  const monthLabels: { index: number; label: string }[] = []
  let lastMonth = ""

  for (let col = 0; col < weekCount; col++) {
    const columnDays = gridCells.slice(col * 7, col * 7 + 7)
    for (const day of columnDays) {
      if (day?.date) {
        try {
          const monthName = format(parseISO(day.date), "MMM")
          if (monthName !== lastMonth) {
            monthLabels.push({ index: col, label: monthName })
            lastMonth = monthName
            break
          }
        } catch {
          // Ignore malformed dates; the review cells still render below.
        }
      }
    }
  }

  return (
    <div
      role="img"
      aria-label={`Activity heatmap showing ${totalReviews} cards reviewed over the last 70 days`}
      className="bg-surface-container-low p-6 sm:p-8 rounded-2xl"
    >
      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="min-w-fit">
          {/* Month labels */}
          <div className="flex text-label-sm text-on-surface-variant mb-2 pl-7 gap-1 sm:gap-1.5 h-4">
            {Array.from({ length: weekCount }).map((_, col) => {
              const match = monthLabels.find((m) => m.index === col)
              return (
                <div key={col} className="w-3 sm:w-4 text-label-sm text-left shrink-0">
                  {match?.label ?? ""}
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            {/* Day of week labels */}
            <div className="grid grid-rows-7 gap-1 sm:gap-1.5 text-label-sm text-on-surface-variant/70 select-none w-5">
              {["Mon", "", "Wed", "", "Fri", "", ""].map((label, index) => (
                <span key={`${label}-${index}`} className="flex h-3 items-center sm:h-4">
                  {label}
                </span>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="grid grid-flow-col grid-rows-7 gap-1 sm:gap-1.5">
              {gridCells.map((day, i) => {
                if (!day) {
                  return <span key={`empty-${i}`} aria-hidden className="size-3 sm:size-4" />
                }

                let formattedDate = day.date
                try {
                  formattedDate = format(parseISO(day.date), "EEE, MMM d, yyyy")
                } catch {
                  // fallback
                }
                const tooltipText = `${day.count} review${day.count === 1 ? "" : "s"} on ${formattedDate}`

                return (
                  <div
                    key={day.date}
                    title={tooltipText}
                    className={cn(
                      "size-3 sm:size-4 rounded-[3px] transition-colors cursor-pointer hover:ring-2 hover:ring-primary/40",
                      getHeatmapClass(day.level)
                    )}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unified legend matching cell scale */}
      <div className="flex flex-col items-start gap-3 text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold mt-6 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="normal-case text-body-sm font-normal text-on-surface-variant">
          <strong className="font-semibold text-on-surface">{totalReviews}</strong> reviews in last 70 days
        </span>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            {HEATMAP_SCALE.map((s) => (
              <div
                key={s.level}
                className={cn("size-2.5 sm:size-3 rounded-[2px]", s.class)}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
