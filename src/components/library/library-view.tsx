'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import type { LibraryBook } from '@/lib/services/book-service';
import { MAX_BOOKS_PER_USER } from '@/lib/books/limits';
import { PageSection } from '@/components/layout/page-header';
import { SectionHeading } from '@/components/primitives/section-heading';
import { EmptyState } from '@/components/primitives/empty-state';
import { BookCard } from '@/components/library/book-card';
import { UploadBookButton } from '@/components/library/upload-book-button';
import { DeleteBookDialog } from '@/components/library/delete-book-dialog';

const POLL_MS = 4000;

interface LibraryViewProps {
  books: LibraryBook[];
  userId: string;
}

export function LibraryView({ books, userId }: LibraryViewProps): React.JSX.Element {
  const router = useRouter();
  const [deleteBook, setDeleteBook] = useState<LibraryBook | null>(null);
  const isProcessing = books.some((book) => book.status === 'processing');
  const atLimit = books.length >= MAX_BOOKS_PER_USER;

  // Books are parsed in the background; refresh the server data until done.
  useEffect(() => {
    if (!isProcessing) return;
    const timer = window.setInterval(() => router.refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [isProcessing, router]);

  const upload = <UploadBookButton userId={userId} disabled={atLimit} />;

  if (books.length === 0) {
    return (
      <PageSection>
        <EmptyState
          icon={<BookOpen />}
          title="Upload your first book"
          body="Add an EPUB (up to 100 MB). You'll be able to read it, highlight passages and take notes."
          action={upload}
        />
      </PageSection>
    );
  }

  return (
    <PageSection className="space-y-6 sm:space-y-8">
      <SectionHeading
        title="Your books"
        action={
          <div className="flex items-center gap-3">
            <span className="text-body-sm tabular text-on-surface-variant">
              {books.length} / {MAX_BOOKS_PER_USER}
            </span>
            {upload}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {books.map((book, index) => (
          <BookCard key={book.id} book={book} index={index} onDelete={() => setDeleteBook(book)} />
        ))}
      </div>
      {deleteBook && (
        <DeleteBookDialog
          book={deleteBook}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteBook(null);
          }}
        />
      )}
    </PageSection>
  );
}
