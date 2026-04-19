import { DashboardDeckCard, DashboardDeck } from "@/components/dashboard/dashboard-deck-card"
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap"
import { TimelineList, TimelineItem } from "@/components/dashboard/timeline-list"

const DECKS: DashboardDeck[] = [
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

const TIMELINE: TimelineItem[] = [
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

export default function DashboardPage() {
  return (
    <>
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

      <section className="mb-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Your Decks</h2>
            <p className="text-on-surface-variant mt-1">Reviewing 3 intellectual domains today.</p>
          </div>
          <button className="text-primary font-semibold flex items-center gap-2 hover:underline">
            View all decks <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        <div className="flex overflow-x-auto gap-8 pb-4 no-scrollbar -mx-2 px-2">
          {DECKS.map((deck) => (
            <DashboardDeckCard key={deck.title} {...deck} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-2">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">Activity</h2>
            <p className="text-on-surface-variant text-sm">Last 70 days of cognitive refinement</p>
          </div>
          <ActivityHeatmap />
        </section>

        <section className="lg:col-span-1">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">Timeline</h2>
            <p className="text-on-surface-variant text-sm">Upcoming intellectual challenges</p>
          </div>
          <TimelineList timeline={TIMELINE} />
        </section>
      </div>

      <button className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-50">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </>
  )
}
