import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bookAnnotations, bookBookmarks, bookSections, books } from '@/lib/db/schema';
import type { BookBookmark } from '@/lib/services/bookmark-service';
import { deleteBlobs, headBlob, putPrivateBlob, readBlobBytes } from '@/lib/blob';
import { EPUB_CONTENT_TYPE, MAX_BOOKS_PER_USER, MAX_BOOK_SIZE_BYTES, isOwnBookPathname } from '@/lib/books/limits';
import { EpubError, parseEpub } from '@/lib/epub/parse';
import { ServiceError } from '@/lib/services/service-error';
import { getReaderPreferences, type ReaderPreferences } from '@/lib/services/reader-preferences-service';

type Book = InferSelectModel<typeof books>;
type BookAnnotation = InferSelectModel<typeof bookAnnotations>;

export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  has_cover: boolean;
  status: Book['status'];
  error: string | null;
  progress: number;
  last_read_at: string | null;
}

export interface ReaderBook {
  id: string;
  title: string;
  author: string | null;
  language: string | null;
  last_cfi: string | null;
  progress: number;
  locations_json: string | null;
  translate_from: string | null;
  translate_to: string | null;
}

export interface ReaderData {
  book: ReaderBook;
  annotations: BookAnnotation[];
  bookmarks: BookBookmark[];
  preferences: ReaderPreferences;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOwnedBook(userId: string, bookId: string): Promise<Book> {
  if (!UUID_RE.test(bookId)) throw new ServiceError('NOT_FOUND', 'Book not found');
  const [book] = await db.select().from(books).where(eq(books.id, bookId));
  if (!book) throw new ServiceError('NOT_FOUND', 'Book not found');
  if (book.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');
  return book;
}

export async function assertBookOwnership(userId: string, bookId: string): Promise<void> {
  await getOwnedBook(userId, bookId);
}

export async function countBooksForUser(userId: string): Promise<number> {
  const [row] = await db.select({ total: count() }).from(books).where(eq(books.user_id, userId));
  return row?.total ?? 0;
}

export async function assertCanAddBook(userId: string): Promise<void> {
  if ((await countBooksForUser(userId)) >= MAX_BOOKS_PER_USER) {
    throw new ServiceError('VALIDATION_ERROR', `Library limit reached (${MAX_BOOKS_PER_USER} books)`);
  }
}

export async function listBooksForUser(userId: string): Promise<LibraryBook[]> {
  const rows = await db
    .select()
    .from(books)
    .where(eq(books.user_id, userId))
    .orderBy(sql`${books.last_read_at} desc nulls last`, desc(books.created_at));

  return rows.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    has_cover: book.cover_pathname !== null,
    status: book.status,
    error: book.error,
    progress: book.progress,
    last_read_at: book.last_read_at?.toISOString() ?? null,
  }));
}

export async function getReaderData(userId: string, bookId: string): Promise<ReaderData> {
  const book = await getOwnedBook(userId, bookId);
  if (book.status !== 'ready') throw new ServiceError('UNAVAILABLE', 'Book is not ready yet');

  const [annotations, bookmarks, preferences] = await Promise.all([
    db.select().from(bookAnnotations).where(eq(bookAnnotations.book_id, bookId)).orderBy(asc(bookAnnotations.created_at)),
    db.select().from(bookBookmarks).where(eq(bookBookmarks.book_id, bookId)).orderBy(asc(bookBookmarks.progress)),
    getReaderPreferences(userId),
  ]);

  return {
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      language: book.language,
      last_cfi: book.last_cfi,
      progress: book.progress,
      locations_json: book.locations_json,
      translate_from: book.translate_from,
      translate_to: book.translate_to,
    },
    annotations,
    bookmarks,
    preferences,
  };
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.epub$/i, '').replace(/[_-]+/g, ' ').trim();
  return base.slice(0, 300) || 'Untitled book';
}

export async function confirmBookUpload(
  userId: string,
  input: { pathname: string; filename: string }
): Promise<{ id: string }> {
  if (!isOwnBookPathname(userId, input.pathname)) {
    throw new ServiceError('FORBIDDEN', 'Invalid upload path');
  }

  const blob = await headBlob(input.pathname);
  if (!blob) throw new ServiceError('NOT_FOUND', 'Uploaded file not found');

  if (blob.size > MAX_BOOK_SIZE_BYTES || blob.contentType !== EPUB_CONTENT_TYPE) {
    await deleteBlobs([input.pathname]);
    throw new ServiceError('VALIDATION_ERROR', 'Only EPUB files up to 100 MB are allowed');
  }

  try {
    await assertCanAddBook(userId);
  } catch (error) {
    await deleteBlobs([input.pathname]);
    throw error;
  }

  const [book] = await db
    .insert(books)
    .values({
      user_id: userId,
      title: titleFromFilename(input.filename),
      blob_pathname: input.pathname,
      file_size: blob.size,
    })
    .onConflictDoNothing({ target: books.blob_pathname })
    .returning({ id: books.id });

  if (!book) throw new ServiceError('VALIDATION_ERROR', 'This upload was already confirmed');
  return book;
}

export async function updateBookMetadata(
  userId: string,
  bookId: string,
  input: { title?: string; author?: string | null }
): Promise<LibraryBook> {
  await getOwnedBook(userId, bookId);
  const [book] = await db
    .update(books)
    .set({ ...input, updated_at: new Date() })
    .where(eq(books.id, bookId))
    .returning();

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    has_cover: book.cover_pathname !== null,
    status: book.status,
    error: book.error,
    progress: book.progress,
    last_read_at: book.last_read_at?.toISOString() ?? null,
  };
}

export async function saveReadingProgress(
  userId: string,
  input: { book_id: string; cfi: string; progress: number }
): Promise<void> {
  await db
    .update(books)
    .set({ last_cfi: input.cfi, progress: input.progress, last_read_at: new Date() })
    .where(and(eq(books.id, input.book_id), eq(books.user_id, userId)));
}

export async function saveBookLocations(
  userId: string,
  input: { book_id: string; locations_json: string }
): Promise<void> {
  await db
    .update(books)
    .set({ locations_json: input.locations_json })
    .where(and(eq(books.id, input.book_id), eq(books.user_id, userId)));
}

export async function deleteBook(userId: string, bookId: string): Promise<void> {
  const book = await getOwnedBook(userId, bookId);
  await deleteBlobs([book.blob_pathname, ...(book.cover_pathname ? [book.cover_pathname] : [])]);
  await db.delete(books).where(eq(books.id, bookId));
}

/** Pathname of the book file or cover, after an ownership check. */
export async function getBookBlobPathname(
  userId: string,
  bookId: string,
  kind: 'file' | 'cover'
): Promise<string> {
  const book = await getOwnedBook(userId, bookId);
  const pathname = kind === 'file' ? book.blob_pathname : book.cover_pathname;
  if (!pathname) throw new ServiceError('NOT_FOUND', 'Cover not found');
  return pathname;
}

// ── Background processing (Inngest `book-process`) ──────────────────────────

const SECTION_BATCH = 50;

/**
 * Validates the uploaded EPUB and stores its metadata, cover and plain-text
 * version. Returns the final status; parse errors become a user-safe message.
 */
export async function processBook(bookId: string): Promise<'ready' | 'failed'> {
  const [book] = await db.select().from(books).where(eq(books.id, bookId));
  if (!book || book.status === 'ready') return 'ready';

  let parsed;
  try {
    parsed = parseEpub(await readBlobBytes(book.blob_pathname));
  } catch (error) {
    if (!(error instanceof EpubError)) throw error; // transient → let Inngest retry
    await markBookFailed(bookId, error.message);
    return 'failed';
  }

  let coverPathname: string | null = null;
  if (parsed.cover) {
    coverPathname = `covers/${book.user_id}/${book.id}.${parsed.cover.extension}`;
    await putPrivateBlob(coverPathname, parsed.cover.bytes, parsed.cover.contentType);
  }

  await db.transaction(async (tx) => {
    await tx.delete(bookSections).where(eq(bookSections.book_id, bookId));
    for (let i = 0; i < parsed.sections.length; i += SECTION_BATCH) {
      await tx.insert(bookSections).values(
        parsed.sections.slice(i, i + SECTION_BATCH).map((section) => ({
          book_id: bookId,
          spine_index: section.spineIndex,
          href: section.href,
          title: section.title,
          text: section.text,
        }))
      );
    }
    await tx
      .update(books)
      .set({
        title: parsed.title?.slice(0, 300) ?? book.title,
        author: parsed.author?.slice(0, 300) ?? null,
        language: parsed.language?.slice(0, 35) ?? null,
        cover_pathname: coverPathname,
        status: 'ready',
        error: null,
        updated_at: new Date(),
      })
      .where(eq(books.id, bookId));
  });

  return 'ready';
}

export async function markBookFailed(bookId: string, message: string): Promise<void> {
  await db
    .update(books)
    .set({ status: 'failed', error: message.slice(0, 300), updated_at: new Date() })
    .where(eq(books.id, bookId));
}
