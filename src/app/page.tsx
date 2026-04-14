// ── Static data ────────────────────────────────────────────────────────────────

interface Deck {
  icon: string
  title: string
  category: string
  mastery: number
  due: number
  iconBg: string
  iconColor: string
}

interface TimelineItem {
  label: string
  deck: string
  cards: number
  meta: string
  dotColor: string
  labelColor: string
}

const decks: Deck[] = [
  {
    icon: "translate",
    title: "English Vocabulary",
    category: "English",
    mastery: 65,
    due: 12,
    iconBg: "bg-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: "science",
    title: "Organic Chemistry",
    category: "Science",
    mastery: 40,
    due: 8,
    iconBg: "bg-secondary-container/20",
    iconColor: "text-secondary",
  },
  {
    icon: "public",
    title: "World Capitals",
    category: "Geography",
    mastery: 90,
    due: 0,
    iconBg: "bg-tertiary/5",
    iconColor: "text-tertiary",
  },
]

const timeline: TimelineItem[] = [
  {
    label: "Tomorrow",
    deck: "English Vocab",
    cards: 14,
    meta: "Intermediate · Spaced Interval",
    dotColor: "bg-primary",
    labelColor: "text-primary",
  },
  {
    label: "In 2 days",
    deck: "Organic Chem",
    cards: 22,
    meta: "Struggling · Re-evaluation",
    dotColor: "bg-error",
    labelColor: "text-error",
  },
  {
    label: "In 3 days",
    deck: "World Capitals",
    cards: 5,
    meta: "Mastered · Maintenance",
    dotColor: "bg-tertiary",
    labelColor: "text-tertiary",
  },
  {
    label: "In 5 days",
    deck: "Spanish Verbs",
    cards: 30,
    meta: "Intermediate · New Batch",
    dotColor: "bg-outline",
    labelColor: "text-on-surface-variant",
  },
  {
    label: "Next Week",
    deck: "Art History",
    cards: 12,
    meta: "Mastered · Long-term",
    dotColor: "bg-outline",
    labelColor: "text-on-surface-variant",
  },
]

// 10 cols × 7 rows = 70 cells. Values map to opacity levels.
const heatmapCells = [
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

// All class names as string literals so Tailwind scanner picks them up.
const heatmapClass: Record<number, string> = {
  0: "bg-surface-container-lowest",
  10: "bg-primary/10",
  20: "bg-primary/20",
  30: "bg-primary/30",
  40: "bg-primary/40",
  60: "bg-primary/60",
  90: "bg-primary/90",
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function DeckCard({ icon, title, category, mastery, due, iconBg, iconColor }: Deck) {
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
        <button className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-sm hover:bg-primary-container transition-colors shadow-sm">
          Study now
        </button>
      ) : (
        <button className="w-full border border-primary text-primary py-3 rounded-lg font-bold text-sm hover:bg-primary/5 transition-colors">
          Study now
        </button>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="bg-background text-on-surface min-h-screen">
      {/* ── Top Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-[12px] flex justify-between items-center px-8 py-4 shadow-sm">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-primary tracking-tight">NeuroCards</span>
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#"
              className="text-primary font-semibold transition-colors duration-200"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:bg-surface-container-low px-3 py-1 rounded transition-colors duration-200"
            >
              Decks
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:bg-surface-container-low px-3 py-1 rounded transition-colors duration-200"
            >
              Library
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
            <span className="text-sm font-medium text-on-surface">Alex Rivera</span>
            <div className="w-10 h-10 rounded-full bg-surface-container-high ring-2 ring-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-on-surface-variant select-none">AR</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="max-w-[1280px] mx-auto pt-28 pb-20 px-8">
        {/* Hero stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
          <div className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/10 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] flex flex-col gap-1">
            <span className="text-primary font-bold text-5xl tracking-tight">24</span>
            <span className="text-on-surface font-semibold text-lg">Cards due today</span>
            <span className="text-on-surface-variant text-sm">across 3 decks</span>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/10 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl">🔥</span>
              <span className="text-on-surface font-bold text-5xl tracking-tight">7 days</span>
            </div>
            <span className="text-on-surface font-semibold text-lg">Study streak</span>
            <span className="text-on-surface-variant text-sm">Personal record is 12!</span>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/10 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] flex flex-col gap-1">
            <span className="text-tertiary font-bold text-5xl tracking-tight">142</span>
            <span className="text-on-surface font-semibold text-lg">Mastered cards</span>
            <span className="text-on-surface-variant text-sm">total</span>
          </div>
        </section>

        {/* Your Decks */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">
                Your Decks
              </h2>
              <p className="text-on-surface-variant mt-1">
                Reviewing 3 intellectual domains today.
              </p>
            </div>
            <button className="text-primary font-semibold flex items-center gap-2 hover:underline">
              View all decks{" "}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          <div className="flex overflow-x-auto gap-8 pb-4 no-scrollbar -mx-2 px-2">
            {decks.map((deck) => (
              <DeckCard key={deck.title} {...deck} />
            ))}
          </div>
        </section>

        {/* Activity + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Activity heatmap */}
          <section className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                Activity
              </h2>
              <p className="text-on-surface-variant text-sm">
                Last 70 days of cognitive refinement
              </p>
            </div>

            <div className="bg-surface-container-low p-8 rounded-xl">
              <div className="grid grid-flow-col grid-rows-7 gap-2">
                {heatmapCells.map((opacity, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm ${heatmapClass[opacity]}`}
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
          </section>

          {/* Timeline */}
          <section className="lg:col-span-1">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                Timeline
              </h2>
              <p className="text-on-surface-variant text-sm">
                Upcoming intellectual challenges
              </p>
            </div>

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
          </section>
        </div>
      </main>

      {/* FAB */}
      <button className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  )
}
