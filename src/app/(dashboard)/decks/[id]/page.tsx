import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { CardList } from '@/components/cards/CardList';
import { listCardsForDeck } from '@/lib/services/card-service';
import { getDeckDetailForUser } from '@/lib/services/deck-service';
import { ServiceError } from '@/lib/services/service-error';

export const metadata: Metadata = {
  title: 'Deck — NeuroCards',
};

import { ArrowLeft } from 'lucide-react';

type Props = { params: Promise<{ id: string }> };

export default async function DeckDetailPage({ params }: Props): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  let deck: Awaited<ReturnType<typeof getDeckDetailForUser>>;
  let deckCards: Awaited<ReturnType<typeof listCardsForDeck>>;

  try {
    deck = await getDeckDetailForUser(session.user.id, id);
    deckCards = await listCardsForDeck(session.user.id, id);
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'NOT_FOUND') {
      notFound();
    }

    throw error;
  }

  const subjectLabel = deck.subject.charAt(0).toUpperCase() + deck.subject.slice(1);

  return (
    <>
      <header className="max-w-7xl mx-auto mb-10">
        <Link
          href="/decks"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          My Decks
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full bg-surface-container-low text-primary mb-3">
              {subjectLabel}
            </span>
            <h1 className="text-[2.5rem] font-extrabold tracking-tight text-on-surface leading-none mb-2">
              {deck.name}
            </h1>
            {deck.description && (
              <p className="text-on-surface-variant max-w-lg">{deck.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">{deckCards.length}</span> cards
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <CardList deckId={id} initialCards={deckCards} />
      </div>
    </>
  );
}
