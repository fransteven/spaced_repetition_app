"use client"

import { useState } from "react"
import NewReminderModal from "@/components/modals/NewReminderModal"

// ── Types & data ────────────────────────────────────────────────────────────

type ModalState = "new-reminder" | null

interface Bucket {
  icon: string
  name: string
  cards: number
  interval: string
  next: string
  borderColor: string
  iconColor: string
}

interface Session {
  date: string
  cards: number
}

interface Program {
  id: string
  name: string
  deck: string
  status: "active" | "paused"
  buckets: Bucket[]
  sessions: Session[]
  lastEmail?: string
}

const PROGRAMS: Program[] = [
  {
    id: "phrasal-verbs",
    name: "Phrasal Verbs Review",
    deck: "Phrasal Verbs",
    status: "active",
    buckets: [
      {
        icon: "trending_down",
        name: "Struggling",
        cards: 8,
        interval: "Every 2 days",
        next: "Tomorrow, Apr 13",
        borderColor: "border-l-error",
        iconColor: "text-error",
      },
      {
        icon: "bar_chart",
        name: "Intermediate",
        cards: 15,
        interval: "Every 10 days",
        next: "Apr 20",
        borderColor: "border-l-secondary",
        iconColor: "text-secondary",
      },
      {
        icon: "done_all",
        name: "Mastered",
        cards: 29,
        interval: "Every 45 days",
        next: "May 27",
        borderColor: "border-l-tertiary",
        iconColor: "text-tertiary",
      },
    ],
    sessions: [
      { date: "Apr 13", cards: 8 },
      { date: "Apr 15", cards: 8 },
      { date: "Apr 20", cards: 15 },
      { date: "Apr 22", cards: 8 },
    ],
    lastEmail: "Apr 12",
  },
  {
    id: "biology-terms",
    name: "Biology Terms",
    deck: "Biology Terms",
    status: "paused",
    buckets: [
      {
        icon: "trending_down",
        name: "Struggling",
        cards: 12,
        interval: "Every 2 days",
        next: "—",
        borderColor: "border-l-outline-variant",
        iconColor: "text-on-surface-variant",
      },
      {
        icon: "bar_chart",
        name: "Intermediate",
        cards: 4,
        interval: "Every 10 days",
        next: "—",
        borderColor: "border-l-outline-variant",
        iconColor: "text-on-surface-variant",
      },
      {
        icon: "done_all",
        name: "Mastered",
        cards: 62,
        interval: "Every 45 days",
        next: "—",
        borderColor: "border-l-outline-variant",
        iconColor: "text-on-surface-variant",
      },
    ],
    sessions: [],
  },
]

const NAV_LINKS = [
  { icon: "grid_view", label: "Dashboard", href: "/" },
  { icon: "style", label: "Study Decks", href: "/decks" },
  { icon: "notifications_active", label: "Reminders", href: "/reminders", active: true },
  { icon: "grid_on", label: "Mastery Heatmap", href: "#" },
  { icon: "settings", label: "Settings", href: "#" },
]

// ── Sub-components ──────────────────────────────────────────────────────────

function Sidebar({ onNewProgram }: { onNewProgram: () => void }) {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low flex flex-col z-40">
      {/* Branding */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-on-primary text-base"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
          </div>
          <span className="text-sm font-extrabold text-primary tracking-tighter leading-tight">
            The Cognitive<br />Atelier
          </span>
        </div>
        <div className="mt-5 pl-0.5">
          <p className="text-xs font-bold text-on-surface">The Curator</p>
          <p className="text-[11px] text-on-surface-variant font-medium">Premium Tier</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              link.active
                ? "bg-primary/8 text-primary font-semibold"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={link.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {link.icon}
            </span>
            {link.label}
          </a>
        ))}
      </nav>

      {/* New Program CTA */}
      <div className="p-4">
        <button
          onClick={onNewProgram}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Program
        </button>
      </div>
    </aside>
  )
}

function TopBar({ onNewProgram }: { onNewProgram: () => void }) {
  return (
    <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-surface/80 backdrop-blur-[12px] flex items-center justify-between px-8 border-b border-outline-variant/10">
      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2 w-72">
        <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
        <input
          type="text"
          placeholder="Search programs..."
          className="bg-transparent text-sm text-on-surface placeholder:text-outline outline-none border-none flex-1"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewProgram}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add New Program
        </button>
        <button className="relative p-2 rounded-full hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant text-xl">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-bold">
          TC
        </div>
      </div>
    </header>
  )
}

function BucketRow({ bucket }: { bucket: Bucket }) {
  return (
    <div className={`flex items-center gap-4 py-3 px-4 border-l-[3px] bg-surface-container-low rounded-r-lg ${bucket.borderColor}`}>
      <span className={`material-symbols-outlined text-xl ${bucket.iconColor}`}>{bucket.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-on-surface">{bucket.name}</p>
          <span className="text-sm font-bold text-on-surface">{bucket.cards} cards</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-on-surface-variant">{bucket.interval}</p>
          <p className="text-xs text-on-surface-variant">Next: {bucket.next}</p>
        </div>
      </div>
    </div>
  )
}

function ProgramCard({
  program,
  onNewProgram,
}: {
  program: Program
  onNewProgram: () => void
}) {
  const isActive = program.status === "active"

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] border border-outline-variant/15 ${
        !isActive ? "opacity-70 grayscale-[0.4]" : ""
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold text-on-surface">{program.name}</h2>
            {isActive ? (
              <span className="bg-tertiary/10 text-tertiary text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Active
              </span>
            ) : (
              <span className="bg-surface-container-high text-on-surface-variant text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">style</span>
            Deck: {program.deck}
          </div>
        </div>
        <button className="p-1.5 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined text-xl">more_vert</span>
        </button>
      </div>

      {/* Buckets */}
      <div className="space-y-2 mb-5">
        {program.buckets.map((bucket) => (
          <BucketRow key={bucket.name} bucket={bucket} />
        ))}
      </div>

      {/* Upcoming sessions or empty state */}
      {program.sessions.length > 0 ? (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            Upcoming Sessions
          </p>
          <div className="flex gap-3 flex-wrap">
            {program.sessions.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2"
              >
                <span className="material-symbols-outlined text-primary text-base">event</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{s.date}</p>
                  <p className="text-[11px] text-on-surface-variant">{s.cards} cards</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-5 py-4 text-center">
          <p className="text-sm text-on-surface-variant italic">No sessions scheduled</p>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">Resume to restart scheduling</p>
          <button
            onClick={onNewProgram}
            className="mt-3 inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            Resume Now
          </button>
        </div>
      )}

      {/* Email footer */}
      {program.lastEmail && (
        <div className="flex items-center gap-2 pt-4 border-t border-outline-variant/10">
          <span className="material-symbols-outlined text-on-surface-variant text-base">mail</span>
          <p className="text-xs text-on-surface-variant">
            Reminder email sent on {program.lastEmail}
          </p>
        </div>
      )}
    </div>
  )
}

function EmptyStateCard({ onNewProgram }: { onNewProgram: () => void }) {
  return (
    <div className="border-2 border-dashed border-outline-variant/40 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-4">
      <div className="bg-surface-container-low rounded-full p-3">
        <span className="material-symbols-outlined text-primary text-3xl">add_circle</span>
      </div>
      <div>
        <p className="text-base font-semibold text-on-surface mb-1">Start a new program</p>
        <p className="text-sm text-on-surface-variant max-w-sm leading-relaxed">
          Connect a deck to start scheduling reviews. We&apos;ll automatically create a Google
          Calendar schedule based on your mastery levels.
        </p>
      </div>
      <button
        onClick={onNewProgram}
        className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-all"
      >
        <span className="material-symbols-outlined text-base">add</span>
        New Program
      </button>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [openModal, setOpenModal] = useState<ModalState>(null)

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar onNewProgram={() => setOpenModal("new-reminder")} />
      <TopBar onNewProgram={() => setOpenModal("new-reminder")} />

      {/* Main content — offset for sidebar + topbar */}
      <main className="pl-64 pt-16">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Page header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">
              Study Reminders
            </h1>
            <p className="text-sm text-on-surface-variant">
              Automated review schedules synced to Google Calendar
            </p>
          </div>

          {/* Program cards */}
          <div className="space-y-6">
            {PROGRAMS.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onNewProgram={() => setOpenModal("new-reminder")}
              />
            ))}

            {/* Empty state */}
            <EmptyStateCard onNewProgram={() => setOpenModal("new-reminder")} />
          </div>
        </div>
      </main>

      {/* Modals */}
      {openModal === "new-reminder" && (
        <NewReminderModal onClose={() => setOpenModal(null)} />
      )}
    </div>
  )
}
