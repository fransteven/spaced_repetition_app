'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CardEditor } from '@/components/cards/CardEditor';
import { DeleteCardDialog } from '@/components/cards/DeleteCardDialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/primitives/pill';
import { Surface } from '@/components/primitives/surface';
import type { CardData } from '@/lib/validations';

interface CardRow extends CardData {
  state: string | null;
  stability: number | null;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
  deck_id: string;
  tags: string[] | null;
}

interface CardListProps {
  deckId: string;
  initialCards: CardRow[];
}

const STATE_TONE: Record<string, React.ComponentProps<typeof Pill>['tone']> = {
  new: 'neutral',
  learning: 'secondary',
  relearning: 'error',
  review: 'tertiary',
};

function scheduleLabel(card: CardRow): string | null {
  const parts: string[] = [];

  if (card.due_date) {
    const due = new Date(card.due_date);
    parts.push(
      due.getTime() <= Date.now()
        ? 'Due now'
        : `Due ${formatDistanceToNow(due, { addSuffix: true })}`
    );
  }

  if (typeof card.stability === 'number' && card.stability > 0) {
    parts.push(`Stability ${Math.round(card.stability)}d`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function CardList({ deckId, initialCards }: CardListProps): React.JSX.Element {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editCard, setEditCard] = useState<CardData | null>(null);
  const [deleteCard, setDeleteCard] = useState<{ id: string; front: string } | null>(null);

  const openCreate = () => {
    setEditCard(null);
    setEditorOpen(true);
  };

  const openEdit = (card: CardRow) => {
    setEditCard({
      id: card.id,
      front: card.front,
      back: card.back,
      image_url_1: card.image_url_1,
      image_url_2: card.image_url_2,
      tags: card.tags,
    });
    setEditorOpen(true);
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {initialCards.length === 0
            ? 'No cards yet'
            : `${initialCards.length} card${initialCards.length !== 1 ? 's' : ''}`}
        </p>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add card
        </Button>
      </div>

      {initialCards.length === 0 ? (
        <Surface tone="panel" className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-highest">
            <Layers className="h-9 w-9 text-primary" />
          </div>
          <h3 className="mb-3 text-display-sm text-on-surface">Blank slate</h3>
          <p className="mb-6 max-w-sm text-body-lg text-on-surface-variant">
            Add your first card to start building your study material.
          </p>
          <Button type="button" variant="secondary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first card
          </Button>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialCards.map((card) => {
            const schedule = scheduleLabel(card);
            return (
              <Surface
                key={card.id}
                ghost
                interactive
                className="group flex flex-col gap-5 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  {card.state && (
                    <Pill tone={STATE_TONE[card.state] ?? 'neutral'} className="px-2.5 py-0.5">
                      {card.state}
                    </Pill>
                  )}
                  {/* Keyboard users never trigger hover — reveal on focus too. */}
                  <div className="ml-auto flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(card)}
                      aria-label={`Edit card: ${card.front.slice(0, 40)}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteCard({ id: card.id, front: card.front })}
                      className="hover:bg-destructive/5 hover:text-destructive"
                      aria-label={`Delete card: ${card.front.slice(0, 40)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-label-sm text-on-surface-variant uppercase">Front</p>
                  <p className="line-clamp-3 text-body-md text-on-surface">{card.front}</p>
                </div>

                {/* Tonal shift instead of a 1px divider — DESIGN.md §2 */}
                <div className="-mx-1 rounded-sm bg-surface-container-low/60 px-3 py-2">
                  <p className="mb-1 text-label-sm text-on-surface-variant uppercase">Back</p>
                  <p className="line-clamp-3 text-body-md text-on-surface-variant">{card.back}</p>
                </div>

                {(card.image_url_1 || card.image_url_2) && (
                  <div className="flex gap-2">
                    {[card.image_url_1, card.image_url_2].filter(Boolean).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url!}
                        loading="lazy"
                        alt={`Illustration ${i + 1} for: ${card.front.slice(0, 60)}`}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}

                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((tag) => (
                      <Pill key={tag} className="px-2 py-0.5 normal-case">
                        {tag}
                      </Pill>
                    ))}
                  </div>
                )}

                {schedule && (
                  <p className={cn('mt-auto text-label-sm text-on-surface-variant uppercase')}>
                    {schedule}
                  </p>
                )}
              </Surface>
            );
          })}
        </div>
      )}

      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        deckId={deckId}
        initialValues={editCard ?? undefined}
      />

      {deleteCard && (
        <DeleteCardDialog
          open={!!deleteCard}
          onOpenChange={(open) => {
            if (!open) setDeleteCard(null);
          }}
          card={deleteCard}
        />
      )}
    </>
  );
}
