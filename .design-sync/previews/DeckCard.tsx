import * as React from 'react';
import { DeckCard } from 'spaced_repetition_app';

const noop = (): void => {};

const base = {
  description: null,
  created_at: '2026-05-02T09:00:00.000Z',
  last_review: '2026-07-23T18:40:00.000Z',
  menuOpen: false,
  onMenuToggle: noop,
  onMenuClose: noop,
  onEdit: noop,
  onDelete: noop,
};

/** Cards are due — primary "Study now" CTA. */
export function DueNow(): React.JSX.Element {
  return (
    <div className="max-w-[380px]">
      <DeckCard
        {...base}
        id="deck-organic-chem"
        name="Organic Chemistry"
        subject="science"
        total_cards={128}
        due_count={17}
        learning_count={24}
        mastered_count={62}
        last_studied_label="2 days ago"
      />
    </div>
  );
}

/** Nothing due — secondary "Review" CTA, italic 0 due. */
export function NothingDue(): React.JSX.Element {
  return (
    <div className="max-w-[380px]">
      <DeckCard
        {...base}
        id="deck-spanish"
        name="Spanish B2 Vocabulary"
        subject="english"
        total_cards={340}
        due_count={0}
        learning_count={18}
        mastered_count={196}
        last_studied_label="6 hours ago"
      />
    </div>
  );
}

/** Every card mastered — tertiary glow, "Fully Mastered", Refresh CTA. */
export function FullyMastered(): React.JSX.Element {
  return (
    <div className="max-w-[380px]">
      <DeckCard
        {...base}
        id="deck-kanji"
        name="JLPT N3 Kanji"
        subject="custom"
        total_cards={84}
        due_count={0}
        learning_count={0}
        mastered_count={84}
        last_studied_label="last week"
      />
    </div>
  );
}

/** Actions menu open — the state the deck list drives via menuOpen. */
export function MenuOpen(): React.JSX.Element {
  return (
    <div className="max-w-[380px] pb-32">
      <DeckCard
        {...base}
        menuOpen
        id="deck-world-history"
        name="World History — 20th Century"
        subject="history"
        total_cards={212}
        due_count={9}
        learning_count={31}
        mastered_count={104}
        last_studied_label="yesterday"
      />
    </div>
  );
}

/** A fresh deck with no reviews yet. */
export function BrandNew(): React.JSX.Element {
  return (
    <div className="max-w-[380px]">
      <DeckCard
        {...base}
        last_review={null}
        id="deck-linear-algebra"
        name="Linear Algebra"
        subject="math"
        total_cards={12}
        due_count={12}
        learning_count={0}
        mastered_count={0}
        last_studied_label="never"
      />
    </div>
  );
}
