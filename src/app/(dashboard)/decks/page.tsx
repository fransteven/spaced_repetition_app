import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DeckList } from '@/components/decks/DeckList';
import { listDecksForUserPage } from '@/lib/services/deck-service';

export const metadata: Metadata = {
  title: 'Mis Mazos',
  description: 'Administra tus mazos de estudio y tarjetas de memoria',
};

export default async function DecksPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userDecks = await listDecksForUserPage(session.user.id);

  return (
    <>
      <header className="max-w-7xl mx-auto mb-10">
        <h1 className="text-[3rem] font-extrabold tracking-tight text-on-surface leading-none mb-2">
          My Decks
        </h1>
        <p className="text-on-surface-variant max-w-lg">
          Manage your intellectual stacks and track your neural mastery levels.
        </p>
      </header>
      <DeckList decks={userDecks} />
    </>
  );
}
