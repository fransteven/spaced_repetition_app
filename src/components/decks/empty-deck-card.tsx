'use client';

import { FolderPlus } from 'lucide-react';

import { Surface } from '@/components/primitives/surface';

interface EmptyDeckCardProps {
  onClick: () => void;
}

/**
 * Celebrated empty state — DESIGN.md §6. Rendered only when the user has no
 * decks at all, never as a filler tile inside a populated grid.
 *
 * It is a single `<button>`: the previous `<div onClick>` had no role, no
 * keyboard handler, and nested another button inside itself.
 */
export function EmptyDeckCard({ onClick }: EmptyDeckCardProps): React.JSX.Element {
  return (
    <Surface
      as="button"
      tone="panel"
      interactive
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col items-center justify-center px-6 py-24 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-highest">
        <FolderPlus className="h-9 w-9 text-primary" />
      </div>
      <h2 className="mb-3 text-display-sm text-on-surface">Mental space</h2>
      <p className="max-w-sm text-body-lg text-on-surface-variant">
        Nothing to review yet. Build your first intellectual stack and the schedule takes care of
        itself.
      </p>
      <span className="mt-6 text-label-md text-primary uppercase">Create your first deck</span>
    </Surface>
  );
}
