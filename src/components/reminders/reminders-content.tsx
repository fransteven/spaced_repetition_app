'use client';

import { useState, useCallback } from 'react';
import NewReminderModal from '@/components/modals/NewReminderModal';
import { ProgramCard } from '@/components/reminders/program-card';
import { EmptyStateCard } from '@/components/reminders/empty-state-card';
import { SendDigestButton } from '@/components/reminders/send-digest-button';
import { SearchField } from '@/components/primitives/search-field';
import { NoResults } from '@/components/primitives/no-results';
import { useListSearch } from '@/hooks/use-list-search';
import type { ReminderProgramItem } from '@/lib/services/reminder-service';
import type { DeckListPageItem } from '@/lib/services/deck-service';

type ModalState = 'new-reminder' | null;

interface Props {
  programs: ReminderProgramItem[];
  decks: DeckListPageItem[];
}

export function RemindersContent({ programs, decks }: Props): React.JSX.Element {
  const [openModal, setOpenModal] = useState<ModalState>(null);

  const getProgramHaystack = useCallback(
    (program: ReminderProgramItem): Array<string | null | undefined> => [
      program.name,
      program.deck_name,
    ],
    []
  );

  const {
    query,
    setQuery,
    results: filteredPrograms,
    isSearching,
    clear,
  } = useListSearch(programs, getProgramHaystack);

  return (
    <>
      <div className="max-w-4xl mx-auto py-10">
        {/* Page header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1">
              Study Reminders
            </h1>
            <p className="text-sm text-on-surface-variant">
              Automated review schedules delivered by email at 8:00 AM
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
              <SendDigestButton />
            </div>
          )}
        </div>

        {/* Program cards */}
        <div className="space-y-6">
          {programs.length === 0 ? (
            <EmptyStateCard onNewProgram={() => setOpenModal('new-reminder')} />
          ) : isSearching && filteredPrograms.length === 0 ? (
            <NoResults query={query} onClear={clear} />
          ) : (
            filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onNewProgram={() => setOpenModal('new-reminder')}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {openModal === 'new-reminder' && (
        <NewReminderModal
          decks={decks}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  );
}
