'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import { PageSection } from '@/components/layout/page-header';
import { EmptyState } from '@/components/primitives/empty-state';
import { OfflineFrame } from '@/components/offline/offline-frame';
import { buttonVariants } from '@/components/ui/button';
import { Reader } from '@/components/reader/reader';
import { getOfflineBook } from '@/lib/offline/book-files';
import { snapshotToReaderData, type OfflineReaderData } from '@/lib/offline/reader-snapshot';

type Loaded = { bookId: string; data: OfflineReaderData | null };

function NotAvailable({ bookId }: { bookId: string | null }): React.JSX.Element {
  return (
    <OfflineFrame>
      <PageSection data-slot="offline-reader" data-book-id={bookId ?? undefined}>
        <EmptyState
          icon={<BookOpen />}
          title={bookId ? 'This book is not downloaded' : 'No book selected'}
          body={
            bookId
              ? 'Download it from your library while online to read it without a connection.'
              : 'Choose a downloaded book to keep reading without a connection.'
          }
          action={
            <Link href="/offline" className={buttonVariants({ size: 'lg' })}>
              Go to downloads
            </Link>
          }
        />
      </PageSection>
    </OfflineFrame>
  );
}

/**
 * The reader for a downloaded book (`?book=<id>`, optional `?cfi=epubcfi(…)`): same <Reader> as
 * /read/[id], fed from the snapshot stored on this device. Never depends on the session.
 */
export function OfflineReadShell(): React.JSX.Element {
  const params = useSearchParams();
  const bookId = params.get('book');
  const cfi = params.get('cfi');
  const startCfi = cfi?.startsWith('epubcfi(') ? cfi : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    getOfflineBook(bookId)
      .then((record) => {
        if (!cancelled) setLoaded({ bookId, data: record ? snapshotToReaderData(record.snapshot) : null });
      })
      .catch((error: unknown) => {
        console.warn('[offline] could not open the downloaded book', bookId, error);
        if (!cancelled) setLoaded({ bookId, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  if (!bookId) return <NotAvailable bookId={null} />;

  const current = loaded?.bookId === bookId ? loaded : null;
  if (!current) {
    return (
      <OfflineFrame>
        <PageSection data-slot="offline-reader" data-book-id={bookId} aria-busy="true">
          <p className="py-24 text-center text-body-md text-on-surface-variant">Opening book…</p>
        </PageSection>
      </OfflineFrame>
    );
  }
  if (!current.data) return <NotAvailable bookId={bookId} />;

  const { data } = current;
  return (
    <Reader
      key={data.book.id}
      book={data.book}
      initialAnnotations={data.annotations}
      initialBookmarks={data.bookmarks}
      initialPreferences={data.preferences}
      initialDeckOptions={data.deck_options}
      startCfi={startCfi}
      backHref="/offline"
    />
  );
}
