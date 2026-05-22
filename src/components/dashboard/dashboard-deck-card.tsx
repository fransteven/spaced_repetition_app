import React from "react"
import Link from "next/link"

export interface DashboardDeck {
  deckId: string
  icon: string
  title: string
  category: string
  mastery: number
  due: number
  iconBg: string
  iconColor: string
}

export function DashboardDeckCard({
  deckId,
  icon,
  title,
  category,
  mastery,
  due,
  iconBg,
  iconColor,
}: DashboardDeck) {
  const hasDue = due > 0
  return (
    <div className="min-w-[360px] bg-surface-container-lowest p-6 rounded-xl ring-1 ring-outline-variant/10 hover:shadow-[0px_12px_32px_rgba(25,28,29,0.04)] transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center ${iconColor}`}>
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        {hasDue ? (
          <span className="bg-error/10 text-error px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {due} due
          </span>
        ) : (
          <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            0 due
          </span>
        )}
      </div>

      <h3 className="text-xl font-bold text-on-surface mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant mb-6">{category}</p>

      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold text-on-surface-variant mb-2">
          <span>Mastery</span>
          <span>{mastery}%</span>
        </div>
        <div className="w-full h-[2px] bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-tertiary" style={{ width: `${mastery}%` }} />
        </div>
      </div>

      {hasDue ? (
        <Link
          href={`/study/${deckId}`}
          className="block w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-sm text-center hover:bg-primary-container transition-colors shadow-sm"
        >
          Study now
        </Link>
      ) : (
        <Link
          href={`/study/${deckId}`}
          className="block w-full border border-primary text-primary py-3 rounded-lg font-bold text-sm text-center hover:bg-primary/5 transition-colors"
        >
          Study now
        </Link>
      )}
    </div>
  )
}
