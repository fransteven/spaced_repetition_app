import * as React from 'react';
import { TimelineList } from 'spaced_repetition_app';

/** The dashboard's upcoming-review timeline. */
export function Upcoming(): React.JSX.Element {
  return (
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
          {
            label: 'In 5 days',
            deck: 'Spanish B2 Vocabulary',
            cards: 22,
            meta: 'Intermediate bucket · every 10 days',
            dotColor: 'bg-primary',
            labelColor: 'text-primary',
          },
          {
            label: 'In 6 weeks',
            deck: 'JLPT N3 Kanji',
            cards: 84,
            meta: 'Mastered bucket · every 45 days',
            dotColor: 'bg-tertiary',
            labelColor: 'text-tertiary',
          },
        ]}
      />
    </div>
  );
}

/** A single upcoming session — no trailing spacing below the last item. */
export function SingleEntry(): React.JSX.Element {
  return (
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
        ]}
      />
    </div>
  );
}
