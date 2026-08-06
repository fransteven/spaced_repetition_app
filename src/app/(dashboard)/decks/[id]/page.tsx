import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CardList } from '@/components/cards/CardList';
import { Pill } from '@/components/primitives/pill';
import { PageHeader, PageSection } from '@/components/layout/page-header';
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
    // FORBIDDEN is answered as 404 too — a non-owner should not learn that the
    // deck exists.
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
          className="mb-4 inline-flex items-center gap-1 text-body-md text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          My decks
        </Link>

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Pill className={`${accent.pill} mb-3`}>{formatSubject(deck.subject)}</Pill>
            <h1 className="mb-2 text-display-md text-on-surface">{deck.name}</h1>
            {deck.description && (
              <p className="max-w-lg text-body-lg text-on-surface-variant">{deck.description}</p>
            )}
          </div>

          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-label-sm text-on-surface-variant uppercase">
              <span>Mastery progress</span>
              <span>{mastery}%</span>
            </div>
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full bg-tertiary" style={{ width: `${mastery}%` }} />
            </div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              <li className="text-label-sm text-on-surface-variant uppercase">
                {deck.total_cards} cards
              </li>
              <li className="text-label-sm text-on-surface-variant uppercase">
                {deck.due_count} due
              </li>
              <li className="text-label-sm text-on-surface-variant uppercase">
                {deck.mastered_count} mastered
              </li>
            </ul>
          </div>
        </div>
      </PageHeader>

      <PageSection>
        <CardList deckId={id} initialCards={deckCards} />
      </PageSection>
    </>
  );
}
