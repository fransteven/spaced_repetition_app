import * as React from 'react';
import { DashboardShell, DashboardDeckCard, TimelineList } from 'spaced_repetition_app';
import { FlaskConical, Sigma } from 'lucide-react';

/** The authenticated page frame: top nav + sidebar + mobile bar, with the
 *  page's own content in <main>. This is the wrapper every dashboard route
 *  renders inside. */
export function DashboardPage(): React.JSX.Element {
  return (
    <DashboardShell>
      <header className="mb-10">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Tuesday, 25 July
        </p>
        <h1 className="text-4xl font-black tracking-tight text-on-surface">
          Good evening, Alex.
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          51 cards are due across 3 decks. Mental space is yours.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Continue studying
        </h2>
        <div className="flex gap-6 overflow-x-auto pb-2">
          <DashboardDeckCard
            deckId="deck-organic-chem"
            icon={FlaskConical}
            title="Organic Chemistry"
            category="Science · 128 cards"
            mastery={48}
            due={17}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <DashboardDeckCard
            deckId="deck-linear-algebra"
            icon={Sigma}
            title="Linear Algebra"
            category="Math · 96 cards"
            mastery={21}
            due={34}
            iconBg="bg-secondary/10"
            iconColor="text-secondary"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Upcoming reviews
        </h2>
        <div className="max-w-md">
          <TimelineList
            timeline={[
              {
                label: 'Today',
                deck: 'Organic Chemistry',
                cards: 17,
                meta: 'Struggling bucket · every 2 days',
                dotColor: 'bg-destructive',
                labelColor: 'text-destructive',
              },
              {
                label: 'Tomorrow',
                deck: 'Linear Algebra',
                cards: 34,
                meta: 'Intermediate bucket · every 10 days',
                dotColor: 'bg-secondary',
                labelColor: 'text-secondary',
              },
            ]}
          />
        </div>
      </section>
    </DashboardShell>
  );
}
