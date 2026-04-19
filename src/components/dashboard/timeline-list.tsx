import React from "react"

export interface TimelineItem {
  label: string
  deck: string
  cards: number
  meta: string
  dotColor: string
  labelColor: string
}

export function TimelineList({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <div className="flex flex-col gap-0 border-l border-outline-variant/30 ml-3">
      {timeline.map((item, i) => (
        <div
          key={item.label}
          className={`relative pl-8 ${i < timeline.length - 1 ? "pb-8" : ""}`}
        >
          <div
            className={`absolute left-[-5px] top-1 w-[9px] h-[9px] rounded-full ${item.dotColor} ring-4 ring-background`}
          />
          <div className="flex flex-col">
            <span
              className={`text-xs font-bold ${item.labelColor} uppercase tracking-widest mb-1`}
            >
              {item.label}
            </span>
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-on-surface">{item.deck}</span>
              <span className="text-xs text-on-surface-variant">
                {item.cards} cards
              </span>
            </div>
            <span className="text-xs text-on-surface-variant/80 mt-1 italic">
              {item.meta}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
