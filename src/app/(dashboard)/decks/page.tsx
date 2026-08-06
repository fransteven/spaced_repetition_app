import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DeckList } from '@/components/decks/DeckList';
import { PageHeader } from '@/components/layout/page-header';
import { listDecksForUserPage } from '@/lib/services/deck-service';

export const metadata: Metadata = {
  title: 'Decks — NeuroCards',
  description: 'Manage your study decks and flashcards',
};

export default async function DecksPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userDecks = await listDecksForUserPage(session.user.id);

  return (
    <>
      <PageHeader>
        <h1 className="mb-2 text-display-lg text-on-surface">My decks</h1>
        <p className="max-w-lg text-body-lg text-on-surface-variant">
          Manage your intellectual stacks and track your neural mastery levels.
        </p>
      </PageHeader>
      <DeckList decks={userDecks} />
    </>
  );
}
