import * as React from 'react';
import { DeckCard, EmptyDeckCard } from 'spaced_repetition_app';

const noop = (): void => {};

/** The dashed create-tile as it appears on its own. */
export function Default(): React.JSX.Element {
  return (
    <div className="max-w-[380px]">
      <EmptyDeckCard onClick={noop} />
    </div>
  );
}

/** In the deck grid it is the last cell, matching the real cards' height. */
export function InDeckGrid(): React.JSX.Element {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <DeckCard
        id="deck-organic-chem"
        name="Organic Chemistry"
        description={null}
        subject="science"
        created_at="2026-05-02T09:00:00.000Z"
        total_cards={128}
        due_count={17}
        learning_count={24}
        mastered_count={62}
        last_review="2026-07-23T18:40:00.000Z"
        last_studied_label="2 days ago"
        menuOpen={false}
        onMenuToggle={noop}
        onMenuClose={noop}
        onEdit={noop}
        onDelete={noop}
      />
      <EmptyDeckCard onClick={noop} />
    </div>
  );
}
