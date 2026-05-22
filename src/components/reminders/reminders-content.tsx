'use client';

import { useState } from 'react';
import NewReminderModal from '@/components/modals/NewReminderModal';
import { ProgramCard } from '@/components/reminders/program-card';
import { EmptyStateCard } from '@/components/reminders/empty-state-card';
import type { ReminderProgramItem } from '@/lib/services/reminder-service';
import type { DeckListPageItem } from '@/lib/services/deck-service';

type ModalState = 'new-reminder' | null;

interface Props {
  programs: ReminderProgramItem[];
  decks: DeckListPageItem[];
}

export function RemindersContent({ programs, decks }: Props) {
  const [openModal, setOpenModal] = useState<ModalState>(null);

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
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onNewProgram={() => setOpenModal('new-reminder')}
            />
          ))}

          {/* Empty state */}
          {programs.length === 0 && (
            <EmptyStateCard onNewProgram={() => setOpenModal('new-reminder')} />
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
