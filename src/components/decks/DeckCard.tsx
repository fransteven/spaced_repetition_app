'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { MoreHorizontal, Pencil, PlusCircle, Trash2, ArrowRight, RefreshCw, RotateCcw } from 'lucide-react';

export interface DeckWithStats {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  created_at: string;
  total_cards: number;
  due_count: number;
  learning_count: number;
  mastered_count: number;
  last_review: string | null;
  last_studied_label: string;
}

interface DeckCardProps extends DeckWithStats {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DeckCard({
  id,
  name,
  subject,
  total_cards,
  due_count,
  learning_count,
  mastered_count,
  last_studied_label,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
}: DeckCardProps): React.JSX.Element {
  const mastery = total_cards > 0 ? Math.round((mastered_count / total_cards) * 100) : 0;
  const fullyMastered = mastery === 100 && total_cards > 0;
  const state = due_count > 0 ? 'study' : fullyMastered ? 'mastered' : 'review';
  const categoryLabel = subject;
  const categoryClass = 'bg-surface-container-low text-primary';
  const stats = { due: due_count, learning: learning_count, mastered: mastered_count };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-6 transition-all hover:shadow-[0px_12px_32px_rgba(25,28,29,0.04)]">
      {state === 'mastered' && (
        <div className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full bg-tertiary/5 blur-2xl" />
      )}

      <div>
        <div className="mb-4 flex items-start justify-between">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${categoryClass}`}
          >
            {categoryLabel}
          </span>

          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMenuToggle}
              aria-label="Open deck actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={onMenuClose} />
                <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-lg border border-outline-variant/10 bg-surface-container-lowest py-2 shadow-xl">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start rounded-none px-4 py-2 text-sm text-on-surface"
                    onClick={() => {
                      onMenuClose();
                      onEdit();
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit deck
                  </Button>
                  <Link
                    href={`/decks/${id}`}
                    onClick={onMenuClose}
                    className={buttonVariants({
                      variant: 'ghost',
                      className: 'w-full justify-start rounded-none px-4 py-2 text-sm text-on-surface',
                    })}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add cards
                  </Link>
                  <hr className="my-1 border-outline-variant/10" />
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start rounded-none px-4 py-2 text-sm text-destructive hover:bg-destructive/5 hover:text-destructive"
                    onClick={() => {
                      onMenuClose();
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <Link href={`/decks/${id}`}>
          <h3 className="mb-1 text-xl font-bold text-on-surface transition-colors group-hover:text-primary">
            {name}
          </h3>
        </Link>

        <p className="mb-6 text-sm text-on-surface-variant">
          {total_cards} cards ·{' '}
          {fullyMastered ? (
            <span className="text-[10px] font-semibold tracking-tighter text-tertiary uppercase">
              Fully Mastered
            </span>
          ) : due_count > 0 ? (
            <span className="font-semibold text-destructive">{due_count} due</span>
          ) : (
            <span className="italic">0 due</span>
          )}
        </p>

        <div className="mb-8 space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">
              <span>Mastery Progress</span>
              <span>{mastery}%</span>
            </div>
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full bg-tertiary" style={{ width: `${mastery}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {state === 'mastered' ? (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-tertiary" />
                <span className="text-[10px] font-medium text-on-surface-variant">
                  {stats.mastered}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.due}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-secondary" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.learning}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-tertiary" />
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {stats.mastered}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] italic text-on-surface-variant">
          Last studied {last_studied_label}
        </span>

        <Link
          href={`/study/${id}`}
          className={buttonVariants({
            variant: state === 'study' ? 'default' : 'secondary',
          })}
        >
          {state === 'study' ? 'Study now' : state === 'review' ? 'Review' : 'Refresh'}
          {state === 'study' ? (
            <ArrowRight className="h-4 w-4 ml-1" />
          ) : state === 'review' ? (
            <RefreshCw className="h-4 w-4 ml-1" />
          ) : (
            <RotateCcw className="h-4 w-4 ml-1" />
          )}
        </Link>
      </div>
    </div>
  );
}
