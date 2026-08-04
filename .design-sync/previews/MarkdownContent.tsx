import * as React from 'react';
import { MarkdownContent } from 'spaced_repetition_app';

/** Card front — the question scale. */
export function Question(): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <MarkdownContent
        size="sm"
        content={
          'What does the **stability (S)** parameter represent in FSRS 4.5, and how does it relate to `retrievability`?'
        }
      />
    </div>
  );
}

/** Card back — the default answer scale, with emphasis and a list. */
export function Answer(): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <MarkdownContent
        content={[
          'Stability is the number of days until recall probability decays to **90 %**.',
          '',
          '- It grows on every successful review.',
          '- It shrinks on a lapse (`Again`).',
          '- Retrievability is derived from it: `R = 0.9 ^ (elapsed / S)`.',
          '',
          '> Cards with `S < 10` are the *Struggling* bucket — reviewed every 2 days.',
        ].join('\n')}
      />
    </div>
  );
}

/** Fenced code with syntax highlighting (rehype-highlight, github-dark). */
export function CodeBlock(): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <MarkdownContent
        content={[
          'The review write must be atomic:',
          '',
          '```ts',
          'await db.transaction(async (tx) => {',
          '  await tx.update(cardSchedules).set(next).where(eq(cardSchedules.card_id, cardId));',
          '  await tx.insert(reviewLogs).values({ card_id: cardId, user_id: userId, rating });',
          '});',
          '```',
        ].join('\n')}
      />
    </div>
  );
}

/** GFM table — remark-gfm is enabled. */
export function Table(): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <MarkdownContent
        content={[
          '| Bucket | Stability | Interval |',
          '| --- | --- | --- |',
          '| Struggling | `S < 10` | every 2 days |',
          '| Intermediate | `10 ≤ S < 50` | every 10 days |',
          '| Mastered | `S ≥ 50` | every 45 days |',
        ].join('\n')}
      />
    </div>
  );
}
