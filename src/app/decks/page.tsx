"use client"

import { useState } from "react"

// ── Types ───────────────────────────────────────────────────────────────────────

type DeckState = "study" | "review" | "mastered"

interface DeckData {
  id: string
  category: string
  categoryColor: "primary" | "tertiary"
  title: string
  verified?: boolean
  totalCards: string
  due: number
  fullyMastered?: boolean
  mastery: number
  stats: { due: number; learning: number; mastered: number }
  lastStudied: string
  state: DeckState
}

// ── Static data ─────────────────────────────────────────────────────────────────

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

// ── Sidebar ─────────────────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low py-8 px-6 pt-24 z-40">
      <div className="mb-8">
        <h2 className="text-lg font-black text-on-surface leading-tight">Cognitive Atelier</h2>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
          The Digital Curator
        </p>
      </div>

      <button className="bg-primary-container text-on-primary py-3 rounded-lg flex items-center justify-center gap-2 mb-8 shadow-sm hover:opacity-90 transition-all">
        <span className="material-symbols-outlined">add</span>
        <span className="font-semibold text-sm">New Deck</span>
      </button>

      <nav className="flex-1 space-y-2">
        <a
          href="/"
          className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary transition-all rounded-lg text-sm font-medium"
        >
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-3 text-primary font-bold border-r-2 border-primary bg-white/50 text-sm"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            style
          </span>
          Decks
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary transition-all rounded-lg text-sm font-medium"
        >
          <span className="material-symbols-outlined">library_books</span>
          Library
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary transition-all rounded-lg text-sm font-medium"
        >
          <span className="material-symbols-outlined">leaderboard</span>
          Analytics
        </a>
      </nav>

      <div className="pt-8 mt-8 border-t border-outline-variant/10 space-y-2">
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary transition-all text-sm"
        >
          <span className="material-symbols-outlined">settings</span>
          Settings
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary transition-all text-sm"
        >
          <span className="material-symbols-outlined">help_outline</span>
          Support
        </a>
      </div>
    </aside>
  )
}

// ── Deck Card ───────────────────────────────────────────────────────────────────

interface DeckCardProps extends DeckData {
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
}

function DeckCard({
  category,
  categoryColor,
  title,
  verified,
  totalCards,
  due,
  fullyMastered,
  mastery,
  stats,
  lastStudied,
  state,
  menuOpen,
  onMenuToggle,
  onMenuClose,
}: DeckCardProps) {
  const categoryClass =
    categoryColor === "tertiary"
      ? "bg-tertiary/10 text-tertiary"
      : "bg-surface-container-low text-primary"

  return (
    <div className="group bg-surface-container-lowest p-6 rounded-xl relative transition-all hover:shadow-[0px_12px_32px_rgba(25,28,29,0.04)] border border-outline-variant/5 flex flex-col justify-between overflow-hidden">
      {/* Mastery decorative glow */}
      {state === "mastered" && (
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-tertiary/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div>
        {/* Category + menu */}
        <div className="flex justify-between items-start mb-4">
          <span
            className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full ${categoryClass}`}
          >
            {category}
          </span>

          <div className="relative">
            <button
              onClick={onMenuToggle}
              className={`p-1 rounded transition-colors ${
                menuOpen
                  ? "bg-surface-container-high text-primary"
                  : "hover:bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">more_horiz</span>
            </button>

            {menuOpen && (
              <>
                {/* Backdrop to close */}
                <div className="fixed inset-0 z-10" onClick={onMenuClose} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/10 z-20 py-2 overflow-hidden">
                  <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">edit</span>
                    Edit deck
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Add cards
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">ios_share</span>
                    Export
                  </button>
                  <hr className="my-1 border-outline-variant/10" />
                  <button className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">delete</span>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-on-surface mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
          {title}
          {verified && (
            <span
              className="material-symbols-outlined text-tertiary text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          )}
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-on-surface-variant mb-6">
          {totalCards} cards ·{" "}
          {fullyMastered ? (
            <span className="text-tertiary font-semibold uppercase tracking-tighter text-[10px]">
              Fully Mastered
            </span>
          ) : due > 0 ? (
            <span className="text-error font-semibold">{due} due</span>
          ) : (
            <span className="italic">0 due</span>
          )}
        </p>

        {/* Mastery bar + legend */}
        <div className="space-y-4 mb-8">
          <div>
            <div className="flex justify-between text-[10px] text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">
              <span>Mastery Progress</span>
              <span>{mastery}%</span>
            </div>
            <div className="h-0.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-tertiary" style={{ width: `${mastery}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {state === "mastered" ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-tertiary" />
                <span className="text-[10px] font-medium text-on-surface-variant">
                  {stats.mastered}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-error" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.due}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.learning}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-tertiary" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.mastered}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-on-surface-variant italic">
          Last studied {lastStudied}
        </span>

        {state === "study" && (
          <button className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded hover:opacity-90 transition-all flex items-center gap-2">
            Study now
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
        {state === "review" && (
          <button className="bg-primary/10 text-primary text-xs font-bold px-4 py-2 rounded hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2">
            Review
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        )}
        {state === "mastered" && (
          <button className="bg-surface-container-low text-on-surface-variant text-xs font-bold px-4 py-2 rounded hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2">
            Refresh
            <span className="material-symbols-outlined text-sm">restart_alt</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Empty state card ─────────────────────────────────────────────────────────────

function EmptyDeckCard() {
  return (
    <div className="border-2 border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[280px] hover:bg-surface-container-low transition-all group cursor-pointer">
      <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-primary text-3xl">post_add</span>
      </div>
      <h3 className="text-lg font-bold text-on-surface mb-2">Create your first deck</h3>
      <p className="text-sm text-on-surface-variant max-w-[200px] mb-6">
        Start your learning journey by building a customized intellectual stack.
      </p>
      <button className="text-primary font-bold text-sm flex items-center gap-2">
        <span className="material-symbols-outlined text-base">add</span>
        Get started
      </button>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function DecksPage() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  return (
    <div className="bg-background text-on-surface min-h-screen">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-[12px] flex justify-between items-center px-8 py-4 shadow-sm">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-primary tracking-tight">NeuroCards</span>
          <div className="hidden md:flex items-center gap-6">
            <a href="/" className="text-primary font-semibold transition-colors duration-200">
              Dashboard
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:bg-surface-container-low px-3 py-1 rounded transition-colors duration-200"
            >
              Explore
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:bg-surface-container-low px-3 py-1 rounded transition-colors duration-200"
            >
              Community
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search decks..."
              className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
            <span className="text-sm font-medium text-on-surface">Alex Rivera</span>
            <div className="w-10 h-10 rounded-full bg-surface-container-high ring-2 ring-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-on-surface-variant select-none">AR</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Canvas */}
      <main className="lg:ml-64 pt-24 pb-24 px-8">
        {/* Page header */}
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

        {/* Filter bar */}
        <section className="max-w-7xl mx-auto mb-8 bg-surface-container-low p-2 rounded-xl flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeFilter === filter
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

        {/* Deck grid */}
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
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-outline-variant/10 flex justify-around items-center px-4 py-3 z-50">
        <a href="/" className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="text-[10px] font-medium">Dashboard</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1 text-primary">
          <span
            className="material-symbols-outlined text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            style
          </span>
          <span className="text-[10px] font-bold">Decks</span>
        </a>
        <div className="relative -top-6">
          <button className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
        <a href="#" className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined text-2xl">library_books</span>
          <span className="text-[10px] font-medium">Library</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined text-2xl">leaderboard</span>
          <span className="text-[10px] font-medium">Stats</span>
        </a>
      </nav>
    </div>
  )
}
