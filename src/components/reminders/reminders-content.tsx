"use client"

import { useState, useCallback } from "react"
import { Plus } from "lucide-react"
import NewReminderModal from "@/components/modals/NewReminderModal"
import { ProgramCard } from "@/components/reminders/program-card"
import { EmptyStateCard } from "@/components/reminders/empty-state-card"
import { SendDigestButton } from "@/components/reminders/send-digest-button"
import { SearchField } from "@/components/primitives/search-field"
import { NoResults } from "@/components/primitives/no-results"
import { PageHeader, PageSection } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useListSearch } from "@/hooks/use-list-search"
import type { ReminderProgramItem } from "@/lib/services/reminder-service"
import type { DeckListPageItem } from "@/lib/services/deck-service"

type ModalState = "new-reminder" | null

interface Props {
  programs: ReminderProgramItem[]
  decks: DeckListPageItem[]
}

export function RemindersContent({ programs, decks }: Props): React.JSX.Element {
  const [openModal, setOpenModal] = useState<ModalState>(null)

  const getProgramHaystack = useCallback(
    (program: ReminderProgramItem): Array<string | null | undefined> => [
      program.name,
      program.deck_name,
    ],
    []
  )

  const {
    query,
    setQuery,
    results: filteredPrograms,
    isSearching,
    clear,
  } = useListSearch(programs, getProgramHaystack)

  return (
    <>
      <PageHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="mb-2 text-display-lg text-on-surface">Study Reminders</h1>
          <p className="max-w-lg text-body-lg text-on-surface-variant">
            Automated review schedules delivered by email at 8:00 AM.
          </p>
        </div>
        {programs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Filter reminders…"
              className="w-full sm:w-56"
            />
            <Button onClick={() => setOpenModal("new-reminder")} className="gap-1.5 shrink-0">
              <Plus className="size-4" />
              New Program
            </Button>
            <SendDigestButton />
          </div>
        )}
      </PageHeader>

      <PageSection>
        {programs.length === 0 ? (
          <EmptyStateCard
            hasDecks={decks.length > 0}
            onNewProgram={() => setOpenModal("new-reminder")}
          />
        ) : isSearching && filteredPrograms.length === 0 ? (
          <NoResults query={query} onClear={clear} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
              />
            ))}
          </div>
        )}
      </PageSection>

      {/* Modals */}
      {openModal === "new-reminder" && (
        <NewReminderModal decks={decks} onClose={() => setOpenModal(null)} />
      )}
    </>
  )
}
