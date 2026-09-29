import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/page-header';
import { LibraryView } from '@/components/library/library-view';
import { listBooksForUser } from '@/lib/services/book-service';

export const metadata: Metadata = {
  title: 'Library — NeuroCards',
  description: 'Your EPUB library: read, highlight and take notes.',
};

export default async function LibraryPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const books = await listBooksForUser(session.user.id);

  return (
    <>
      <PageHeader>
        <h1 className="mb-2 text-display-lg text-on-surface">Library</h1>
        <p className="max-w-lg text-body-lg text-on-surface-variant">
          Read your books, highlight what matters and keep notes next to the text.
        </p>
      </PageHeader>
      <LibraryView books={books} userId={session.user.id} />
    </>
  );
}
