'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CardEditor } from '@/components/cards/CardEditor';
import { Button } from '@/components/ui/button';
import type { CardData } from '@/lib/validations';
import { Plus, Layers, Pencil, Trash2, Loader2 } from 'lucide-react';

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

const STATE_STYLES: Record<string, string> = {
  new:        'bg-surface-container-high text-on-surface-variant',
  learning:   'bg-secondary/10 text-secondary',
  relearning: 'bg-error/10 text-error',
  review:     'bg-tertiary/10 text-tertiary',
};

export function CardList({ deckId, initialCards }: CardListProps): React.JSX.Element {
  const router = useRouter();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editCard,   setEditCard]   = useState<CardData | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditCard(null);
    setEditorOpen(true);
  };

  const openEdit = (card: CardRow) => {
    setEditCard({
      id:          card.id,
      front:       card.front,
      back:        card.back,
      image_url_1: card.image_url_1,
      image_url_2: card.image_url_2,
      tags:        card.tags,
    });
    setEditorOpen(true);
  };

  const handleDelete = (cardId: string) => {
    setDeletingId(cardId);
    startTransition(async () => {
      try {
        await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-on-surface-variant">
          {initialCards.length === 0
            ? 'No cards yet'
            : `${initialCards.length} card${initialCards.length !== 1 ? 's' : ''}`}
        </p>
        <Button
          type="button"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add card
        </Button>
      </div>

      {initialCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No cards yet</h3>
          <p className="text-sm text-on-surface-variant max-w-xs mb-6">
            Add your first card to start building your study material.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add your first card
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {initialCards.map((card) => {
            const isDeleting = isPending && deletingId === card.id;
            return (
              <div
                key={card.id}
                className={`group bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/5 flex flex-col gap-3 hover:shadow-[0px_12px_32px_rgba(25,28,29,0.04)] transition-all ${
                  isDeleting ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {card.state && (
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-full ${STATE_STYLES[card.state] ?? STATE_STYLES.new}`}>
                      {card.state}
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-auto opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(card)}
                          title="Edit card"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(card.id)}
                          className="hover:bg-destructive/5 hover:text-destructive"
                          title="Delete card"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Front</p>
                  <p className="text-sm text-on-surface line-clamp-3">{card.front}</p>
                </div>

                <div className="h-px bg-surface-container-high" />

                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Back</p>
                  <p className="text-sm text-on-surface-variant line-clamp-3">{card.back}</p>
                </div>

                {(card.image_url_1 || card.image_url_2) && (
                  <div className="flex gap-2">
                    {[card.image_url_1, card.image_url_2].filter(Boolean).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url!}
                        alt={`Card image ${i + 1}`}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}

                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-surface-container-low text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
    </>
  );
}
