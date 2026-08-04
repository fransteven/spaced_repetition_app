import * as React from 'react';
import { ProgramCard } from 'spaced_repetition_app';

const noop = (): void => {};

const buckets = [
  { name: 'Struggling', cards: 12, intervalDays: 2, next_date_label: 'Tue, Jul 28' },
  { name: 'Intermediate', cards: 8, intervalDays: 10, next_date_label: 'Wed, Aug 5' },
  { name: 'Mastered', cards: 5, intervalDays: 45, next_date_label: 'Mon, Sep 8' },
];

/** An active program: buckets plus the generated calendar sessions. */
export function Active(): React.JSX.Element {
  return (
    <div className="max-w-2xl">
      <ProgramCard
        onNewProgram={noop}
        program={{
          id: 'prog-organic-chem',
          name: 'Organic Chemistry — exam prep',
          deck_id: 'deck-organic-chem',
          deck_name: 'Organic Chemistry',
          active: true,
          buckets,
          sessions: [
            { date: 'Tue, Jul 28', cards: 12 },
            { date: 'Thu, Jul 30', cards: 12 },
            { date: 'Wed, Aug 5', cards: 8 },
            { date: 'Mon, Sep 8', cards: 5 },
          ],
          created_at: '2026-06-14T08:30:00.000Z',
        }}
      />
    </div>
  );
}

/** Paused: the whole card dims and desaturates. */
export function Paused(): React.JSX.Element {
  return (
    <div className="max-w-2xl">
      <ProgramCard
        onNewProgram={noop}
        program={{
          id: 'prog-spanish',
          name: 'Spanish B2 — maintenance',
          deck_id: 'deck-spanish',
          deck_name: 'Spanish B2 Vocabulary',
          active: false,
          buckets: [
            { name: 'Intermediate', cards: 18, intervalDays: 10, next_date_label: 'Paused' },
            { name: 'Mastered', cards: 196, intervalDays: 45, next_date_label: 'Paused' },
          ],
          sessions: [],
          created_at: '2026-04-02T11:00:00.000Z',
        }}
      />
    </div>
  );
}

/** A brand-new program whose deck has no cards scheduled yet. */
export function NoSessions(): React.JSX.Element {
  return (
    <div className="max-w-2xl">
      <ProgramCard
        onNewProgram={noop}
        program={{
          id: 'prog-linear-algebra',
          name: 'Linear Algebra — semester plan',
          deck_id: 'deck-linear-algebra',
          deck_name: 'Linear Algebra',
          active: true,
          buckets: [
            { name: 'Struggling', cards: 0, intervalDays: 2, next_date_label: '—' },
            { name: 'Intermediate', cards: 0, intervalDays: 10, next_date_label: '—' },
            { name: 'Mastered', cards: 0, intervalDays: 45, next_date_label: '—' },
          ],
          sessions: [],
          created_at: '2026-07-24T19:15:00.000Z',
        }}
      />
    </div>
  );
}
