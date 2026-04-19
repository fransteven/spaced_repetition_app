"use client"

import { useState } from "react"
import { DeckCard, DeckData } from "@/components/decks/deck-card"
import { EmptyDeckCard } from "@/components/decks/empty-deck-card"

const DECKS: DeckData[] = [
  {
    id: "neuroanatomy",
    category: "Science",
    categoryColor: "primary",
    title: "Neuroanatomy Basics",
    totalCards: "458",
    due: 12,
    mastery: 68,
    stats: { due: 12, learning: 142, mastered: 304 },
    lastStudied: "2h ago",
    state: "study",
  },
  {
    id: "cold-war",
    category: "History",
    categoryColor: "primary",
    title: "Cold War Geopolitics",
    totalCards: "124",
    due: 5,
    mastery: 24,
    stats: { due: 5, learning: 80, mastered: 39 },
    lastStudied: "1d ago",
    state: "study",
  },
  {
    id: "gre-vocab",
    category: "English",
    categoryColor: "primary",
    title: "GRE Advanced Vocab",
    totalCards: "1,020",
    due: 0,
    mastery: 92,
    stats: { due: 0, learning: 82, mastered: 938 },
    lastStudied: "4d ago",
    state: "review",
  },
  {
    id: "discrete-math",
    category: "Math",
    categoryColor: "primary",
    title: "Discrete Mathematics",
    totalCards: "86",
    due: 22,
    mastery: 12,
    stats: { due: 22, learning: 54, mastered: 10 },
    lastStudied: "5h ago",
    state: "study",
  },
  {
    id: "productivity",
    category: "Custom",
    categoryColor: "tertiary",
    title: "Productivity Hacks",
    verified: true,
    totalCards: "24",
    due: 0,
    fullyMastered: true,
    mastery: 100,
    stats: { due: 0, learning: 0, mastered: 24 },
    lastStudied: "2w ago",
    state: "mastered",
  },
]

const FILTERS = ["All", "English", "Science", "Math", "History", "Custom"]

export default function DecksPage() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  return (
    <>
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-[3rem] font-extrabold tracking-tight text-on-surface leading-none mb-2">
            My Decks
          </h1>
          <p className="text-on-surface-variant max-w-lg">
            Manage your intellectual stacks and track your neural mastery levels.
          </p>
        </div>
        <button className="bg-primary-container text-on-primary px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap">
          <span className="material-symbols-outlined">add</span>
          New Deck
        </button>
      </header>

      <section className="max-w-7xl mx-auto mb-8 bg-surface-container-low p-2 rounded-xl flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeFilter === filter
                ? "bg-primary-container text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high font-medium"
              }`}
          >
            {filter}
          </button>
        ))}

        <div className="ml-auto hidden sm:flex items-center bg-surface-container-lowest rounded-lg border border-outline-variant/10 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <span className="material-symbols-outlined pl-3 text-outline text-lg">search</span>
          <input
            type="text"
            placeholder="Filter by name..."
            className="bg-transparent border-none py-2 px-3 text-sm focus:outline-none w-48"
          />
        </div>
      </section>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {DECKS.map((deck) => (
          <DeckCard
            key={deck.id}
            {...deck}
            menuOpen={openMenuId === deck.id}
            onMenuToggle={() =>
              setOpenMenuId(openMenuId === deck.id ? null : deck.id)
            }
            onMenuClose={() => setOpenMenuId(null)}
          />
        ))}
        <EmptyDeckCard />
      </div>
    </>
  )
}
