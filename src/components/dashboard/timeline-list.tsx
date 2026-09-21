import React from "react"
import { getLearningState, type LearningStateBucket } from "@/lib/learning-state"

export interface TimelineItem {
  id?: string
  label: string
  deck: string
  cards: number
  meta: string
  bucket: LearningStateBucket
}

export function TimelineList({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <div className="flex flex-col gap-0 border-l border-outline-variant/30 ml-3">
      {timeline.map((item, i) => {
        const state = getLearningState(item.bucket)
        return (
          <div
            key={item.id ?? `${item.label}-${item.deck}-${item.meta}-${i}`}
            className={`relative pl-8 animate-rise-in ${i < timeline.length - 1 ? "pb-8" : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className={`absolute left-[-5px] top-1 w-[9px] h-[9px] rounded-full ${state.dotClass} ring-4 ring-background`}
            />
            <div className="flex flex-col">
              <span
                className={`text-label-sm font-semibold ${state.textClass} uppercase tracking-wider mb-1`}
              >
                {item.label}
              </span>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-on-surface">{item.deck}</span>
                <span className="text-label-md text-on-surface-variant">
                  {item.cards} cards
                </span>
              </div>
              <span className="text-body-sm text-on-surface-variant/80 mt-1 italic">
                {item.meta}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
