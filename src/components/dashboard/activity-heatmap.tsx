import React from "react"

const HEATMAP_CELLS = [
  0, 20, 40, 0, 10, 60, 20,
  30, 10, 90, 40, 20, 30, 10,
  40, 0, 20, 60, 10, 30, 20,
  10, 40, 20, 0, 10, 60, 30,
  20, 10, 30, 10, 90, 40, 20,
  40, 20, 10, 60, 0, 30, 20,
  10, 40, 20, 10, 30, 90, 10,
  30, 10, 60, 40, 20, 10, 30,
  20, 10, 90, 40, 20, 60, 10,
  10, 30, 20, 10, 40, 60, 90,
]

const HEATMAP_CLASS: Record<number, string> = {
  0: "bg-surface-container-lowest",
  10: "bg-primary/10",
  20: "bg-primary/20",
  30: "bg-primary/30",
  40: "bg-primary/40",
  60: "bg-primary/60",
  90: "bg-primary/90",
}

export function ActivityHeatmap() {
  return (
    <div className="bg-surface-container-low p-8 rounded-xl">
      <div className="grid grid-flow-col grid-rows-7 gap-2">
        {HEATMAP_CELLS.map((opacity, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-sm ${HEATMAP_CLASS[opacity]}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-6">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-surface-container-lowest" />
          <div className="w-3 h-3 rounded-sm bg-primary/25" />
          <div className="w-3 h-3 rounded-sm bg-primary/50" />
          <div className="w-3 h-3 rounded-sm bg-primary/75" />
          <div className="w-3 h-3 rounded-sm bg-primary" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
