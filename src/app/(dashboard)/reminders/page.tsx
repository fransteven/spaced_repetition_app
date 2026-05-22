import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { listProgramsForUser } from '@/lib/services/reminder-service';
import { listDecksForUserPage } from '@/lib/services/deck-service';
import { RemindersContent } from '@/components/reminders/reminders-content';

export const metadata: Metadata = {
  title: 'Reminders — NeuroCards',
  description: 'Automated study reminders synced to Google Calendar',
};

export default async function RemindersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const programs = await listProgramsForUser(session.user.id);
  const decks = await listDecksForUserPage(session.user.id);

  return <RemindersContent programs={programs} decks={decks} />;
}
