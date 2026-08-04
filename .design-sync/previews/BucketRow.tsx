import * as React from 'react';
import { BucketRow } from 'spaced_repetition_app';

/** The three FSRS stability buckets, as a reminder program lists them. */
export function AllBuckets(): React.JSX.Element {
  return (
    <div className="max-w-xl space-y-2">
      <BucketRow
        bucket={{
          icon: 'trending_down',
          name: 'Struggling',
          cards: 12,
          interval: 'Every 2 days',
          next: 'Tue, Jul 28',
          borderColor: 'border-l-error',
          iconColor: 'text-error',
        }}
      />
      <BucketRow
        bucket={{
          icon: 'bar_chart',
          name: 'Intermediate',
          cards: 8,
          interval: 'Every 10 days',
          next: 'Wed, Aug 5',
          borderColor: 'border-l-secondary',
          iconColor: 'text-secondary',
        }}
      />
      <BucketRow
        bucket={{
          icon: 'done_all',
          name: 'Mastered',
          cards: 5,
          interval: 'Every 45 days',
          next: 'Mon, Sep 8',
          borderColor: 'border-l-tertiary',
          iconColor: 'text-tertiary',
        }}
      />
    </div>
  );
}

/** Unknown icon key falls back to the help glyph and the neutral outline. */
export function UnknownBucket(): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <BucketRow
        bucket={{
          icon: 'not_a_known_key',
          name: 'Uncategorised',
          cards: 0,
          interval: 'Not scheduled',
          next: '—',
          borderColor: 'border-l-outline-variant',
          iconColor: 'text-on-surface-variant',
        }}
      />
    </div>
  );
}
