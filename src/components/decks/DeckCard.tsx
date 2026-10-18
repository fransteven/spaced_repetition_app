'use client';

import Link from 'next/link';
import {
  ArrowRight,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { useDeckFontSize } from '@/hooks/use-deck-font-size';
import { DECK_TYPOGRAPHY } from '@/lib/deck-typography';
import { cn } from '@/lib/utils';
import { formatSubject, subjectAccent } from '@/lib/subject-accent';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pill } from '@/components/primitives/pill';
import { Surface } from '@/components/primitives/surface';
import { MasteryThread } from '@/components/primitives/mastery-thread';

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
  onEdit: () => void;
  onDelete: () => void;
}

export function DeckCard({
  id,
  name,
  description,
  subject,
  total_cards,
  due_count,
  learning_count,
  mastered_count,
  last_studied_label,
  onEdit,
  onDelete,
}: DeckCardProps): React.JSX.Element {
  const { fontSize } = useDeckFontSize();
  const typography = DECK_TYPOGRAPHY[fontSize];
  const mastery = total_cards > 0 ? Math.round((mastered_count / total_cards) * 100) : 0;
  const fullyMastered = mastery === 100 && total_cards > 0;
  const state = due_count > 0 ? 'study' : fullyMastered ? 'mastered' : 'review';
  const accent = subjectAccent(subject);

  const breakdown = [
    { label: 'Due', value: due_count, dot: 'bg-state-struggling' },
    { label: 'Learning', value: learning_count, dot: 'bg-state-intermediate' },
    { label: 'Mastered', value: mastered_count, dot: 'bg-state-mastered' },
  ];

  return (
    <Surface
      ghost
      interactive
      className="group relative flex flex-col justify-between overflow-hidden p-5 sm:p-6"
    >
      {state === 'mastered' && (
        <div className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full bg-state-mastered/10 blur-2xl" />
      )}

      <div>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill className={accent.pill} size="sm">{formatSubject(subject)}</Pill>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Deck actions" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit deck
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/decks/${id}`} />}>
                <PlusCircle className="h-4 w-4" />
                Add cards
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link href={`/decks/${id}`}>
          <h3 className={cn('mb-2 break-words text-on-surface transition-colors group-hover:text-primary', typography.title)}>
            {name}
          </h3>
        </Link>

        {description && (
          <p className={cn('mb-3 break-words leading-relaxed text-on-surface-variant', typography.body)}>{description}</p>
        )}

        <p className={cn('mb-6 text-on-surface-variant', typography.metadata)}>
          {total_cards} cards ·{' '}
          {fullyMastered ? (
            <span className="font-semibold text-state-mastered">Fully mastered</span>
          ) : due_count > 0 ? (
            <span className="font-semibold text-state-struggling">{due_count} due</span>
          ) : (
            <span className="italic">0 due</span>
          )}
        </p>

        <div className="mb-8 space-y-4">
          <div>
            <div className={cn('mb-1.5 flex justify-between gap-2 text-on-surface-variant font-semibold', typography.metadata)}>
              <span>Mastery progress</span>
              <span className="tabular">{mastery}%</span>
            </div>
            <MasteryThread value={mastery} />
          </div>

          {/* Labelled breakdown with semantic dots */}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {breakdown.map(({ label, value, dot }) => (
              <li key={label} className="flex items-center gap-1.5">
                <span aria-hidden className={cn('size-2 rounded-full', dot)} />
                <span className={cn('text-on-surface-variant font-semibold', typography.metadata)}>
                  {label} <span className="tabular">{value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <span className={cn('text-on-surface-variant italic', typography.metadata)}>
          Last studied {last_studied_label}
        </span>

        <Link
          href={`/study/${id}`}
          className={buttonVariants({
            variant: state === 'study' ? 'default' : 'secondary',
            size: 'lg',
          })}
        >
          {state === 'study' ? 'Study now' : state === 'review' ? 'Review' : 'Refresh'}
          {state === 'study' ? (
            <ArrowRight className="ml-1 h-4 w-4" />
          ) : state === 'review' ? (
            <RefreshCw className="ml-1 h-4 w-4" />
          ) : (
            <RotateCcw className="ml-1 h-4 w-4" />
          )}
        </Link>
      </div>
    </Surface>
  );
}
