import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';

import { CardList } from '@/components/cards/CardList';
import { Pill } from '@/components/primitives/pill';
import { PageHeader, PageSection } from '@/components/layout/page-header';
import { StatCard } from '@/components/primitives/stat-card';
import { MasteryThread } from '@/components/primitives/mastery-thread';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatSubject, subjectAccent } from '@/lib/subject-accent';
import { listCardsForDeck } from '@/lib/services/card-service';
import { getDeckDetailForUser } from '@/lib/services/deck-service';
import { ServiceError } from '@/lib/services/service-error';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: 'Deck — NeuroCards' };

  const { id } = await params;
  try {
    const deck = await getDeckDetailForUser(session.user.id, id);
    return {
      title: `${deck.name} — NeuroCards`,
      description: deck.description || `Cards and study progress for ${deck.name}`,
    };
  } catch {
    return { title: 'Deck — NeuroCards' };
  }
}

export default async function DeckDetailPage({ params }: Props): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  let deck: Awaited<ReturnType<typeof getDeckDetailForUser>>;
  let deckCards: Awaited<ReturnType<typeof listCardsForDeck>>;

  try {
    [deck, deckCards] = await Promise.all([
      getDeckDetailForUser(session.user.id, id),
      listCardsForDeck(session.user.id, id),
    ]);
  } catch (error) {
    if (error instanceof ServiceError && (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')) {
      notFound();
    }
    throw error;
  }

  const accent = subjectAccent(deck.subject);
  const mastery = deck.total_cards > 0 ? Math.round((deck.mastered_count / deck.total_cards) * 100) : 0;

  return (
    <>
      <PageHeader>
        <Link
          href="/decks"
          className="mb-4 inline-flex items-center gap-1.5 text-body-md text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          My decks
        </Link>

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Pill className={`${accent.pill} mb-3`} size="sm">{formatSubject(deck.subject)}</Pill>
            <h1 className="mb-2 text-display-md text-on-surface">{deck.name}</h1>
            {deck.description && (
              <p className="max-w-lg text-body-lg text-on-surface-variant">{deck.description}</p>
            )}
          </div>

          <div className="flex w-full flex-col gap-4 md:w-auto md:min-w-[280px] md:max-w-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-label-sm text-on-surface-variant uppercase font-semibold">
                <span>Mastery progress</span>
                <span className="tabular">{mastery}%</span>
              </div>
              <MasteryThread value={mastery} />
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                <li className="text-label-sm text-on-surface-variant uppercase font-semibold">
                  {deck.total_cards} cards
                </li>
                <li className="text-label-sm text-on-surface-variant uppercase font-semibold">
                  {deck.due_count} due
                </li>
                <li className="text-label-sm text-on-surface-variant uppercase font-semibold">
                  {deck.mastered_count} mastered
                </li>
              </ul>
            </div>

            {deck.total_cards > 0 ? (
              <Link
                href={`/study/${id}`}
                className={cn(
                  buttonVariants({
                    variant: deck.due_count > 0 ? 'default' : 'secondary',
                    size: 'lg',
                  }),
                  'w-full gap-2 font-semibold cursor-pointer'
                )}
              >
                <Play className="size-4 fill-current" />
                Study now
                {deck.due_count > 0 && (
                  <span className="ml-auto rounded-full bg-primary-foreground/20 px-2 py-0.5 text-label-sm font-bold">
                    {deck.due_count}
                  </span>
                )}
              </Link>
            ) : (
              <Button
                disabled
                variant="outline"
                size="lg"
                className="w-full gap-2 opacity-50 cursor-not-allowed"
              >
                <Play className="size-4" />
                Study now
              </Button>
            )}
          </div>
        </div>
      </PageHeader>

      <PageSection className="space-y-8">
        {/* Compact stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            label="Total cards"
            value={deck.total_cards}
            tone="neutral"
            hint="Cards in this deck"
          />
          <StatCard
            label="Cards due"
            value={deck.due_count}
            tone={deck.due_count > 0 ? "struggling" : "neutral"}
            hint={deck.due_count > 0 ? "Ready for review" : "All caught up"}
          />
          <StatCard
            label="Mastered"
            value={deck.mastered_count}
            tone="mastered"
            hint={`${mastery}% of deck mastered`}
          />
        </div>

        <CardList deckId={id} initialCards={deckCards} />
      </PageSection>

      {/* Mobile Sticky Study Action when cards are due */}
      {deck.due_count > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 lg:hidden">
          <Link
            href={`/study/${id}`}
            className={cn(
              buttonVariants({ variant: 'default', size: 'xl' }),
              'w-full gap-2 font-bold shadow-ambient-lg flex items-center justify-center'
            )}
          >
            <Play className="size-5 fill-current" />
            Study now ({deck.due_count} due)
          </Link>
        </div>
      )}
    </>
  );
}
