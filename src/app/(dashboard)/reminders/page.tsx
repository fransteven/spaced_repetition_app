"use client"

import { useState } from "react"
import NewReminderModal from "@/components/modals/NewReminderModal"
import { ProgramCard, Program } from "@/components/reminders/program-card"
import { EmptyStateCard } from "@/components/reminders/empty-state-card"

type ModalState = "new-reminder" | null

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

export default function RemindersPage() {
  const [openModal, setOpenModal] = useState<ModalState>(null)

  return (
    <>
      <div className="max-w-4xl mx-auto py-10">
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

      {/* Modals */}
      {openModal === "new-reminder" && (
        <NewReminderModal onClose={() => setOpenModal(null)} />
      )}
    </>
  )
}
