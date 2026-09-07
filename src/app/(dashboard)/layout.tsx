import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listDecksForUserPage } from '@/lib/services/deck-service';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import type { PaletteDeck } from '@/components/search/command-palette';

export const metadata: Metadata = {
  title: 'Dashboard — NeuroCards',
  description: 'Your NeuroCards study dashboard.',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userDecks = await listDecksForUserPage(session.user.id);
  const decks: PaletteDeck[] = userDecks.map((d) => ({
    id: d.id,
    name: d.name,
    subject: d.subject,
    description: d.description,
  }));

  return <DashboardShell decks={decks}>{children}</DashboardShell>;
}
