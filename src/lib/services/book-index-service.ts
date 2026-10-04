import { and, asc, cosineDistance, count, eq, gt, gte, inArray, lt, lte, ne, or, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bookChunks, bookSections, books } from '@/lib/db/schema';
import type { InternalChunk } from '@/lib/validations';
import { getOwnedBook } from '@/lib/services/book-service';
import { ServiceError } from '@/lib/services/service-error';

/**
 * Data side of "Ask the book". The srs-llm-api service (LangGraph + OpenAI) owns the RAG logic but
 * never touches the database: it reads sections, writes chunks and searches vectors through the
 * internal routes that call these functions. Ownership and the spoiler filter are enforced here.
 */

type Book = InferSelectModel<typeof books>;
export type IndexStatus = Book['index_status'];

/** An index run that has not touched the book for this long is considered dead and may be taken over. */
export const INDEX_STALE_MS = 15 * 60 * 1000;
/** Keeps one sections page well under the 4.5 MB serverless response limit (one big section is always allowed). */
const SECTIONS_PAGE_MAX_CHARS = 1_500_000;

export interface SectionPage {
  sections: Array<{ id: string; spine_index: number; title: string | null; href: string; text: string }>;
  next_after: number | null;
}

export interface SearchHit {
  id: string;
  spine_index: number;
  chunk_index: number; // with spine_index, the exact reading order
  section_title: string | null;
  href: string; // zip path of the section (book_sections.href)
  text: string;
  distance: number;
}

export interface SearchResult {
  index_status: IndexStatus;
  index_fingerprint: string | null;
  chunks: SearchHit[];
}

export interface AskContext {
  book: { title: string; author: string | null; language: string | null };
  spine_limit: number | null;
  current_spine: number | null; // section being read: what "this chapter" means
  index_ready: boolean;
  needs_index: boolean;
}

// ── Indexing (called by the Python service) ──────────────────────────────────

/**
 * Claims the index for a book. Compare-and-set: only one run at a time, unless the previous one
 * went stale. Clears the old chunks. Returns how many sections will be paged.
 */
export async function beginBookIndex(bookId: string): Promise<{ section_count: number }> {
  const staleBefore = new Date(Date.now() - INDEX_STALE_MS);
  const [claimed] = await db
    .update(books)
    .set({ index_status: 'indexing', index_fingerprint: null, updated_at: new Date() })
    .where(and(
      eq(books.id, bookId),
      eq(books.status, 'ready'),
      or(ne(books.index_status, 'indexing'), lt(books.updated_at, staleBefore)),
    ))
    .returning({ id: books.id });

  if (!claimed) {
    const [book] = await db.select({ status: books.status }).from(books).where(eq(books.id, bookId));
    if (!book) throw new ServiceError('NOT_FOUND', 'Book not found');
    if (book.status !== 'ready') throw new ServiceError('VALIDATION_ERROR', 'Book is not ready yet');
    throw new ServiceError('UNAVAILABLE', 'Indexing is already running for this book');
  }

  await db.delete(bookChunks).where(eq(bookChunks.book_id, bookId));
  const [sections] = await db.select({ total: count() }).from(bookSections).where(eq(bookSections.book_id, bookId));
  return { section_count: sections?.total ?? 0 };
}

export async function listSectionsPage(bookId: string, after: number, limit: number): Promise<SectionPage> {
  await assertBookExists(bookId);
  const rows = await db
    .select({
      id: bookSections.id,
      spine_index: bookSections.spine_index,
      title: bookSections.title,
      href: bookSections.href,
      text: bookSections.text,
    })
    .from(bookSections)
    .where(and(eq(bookSections.book_id, bookId), gt(bookSections.spine_index, after)))
    .orderBy(asc(bookSections.spine_index))
    .limit(limit);

  const sections: SectionPage['sections'] = [];
  let size = 0;
  for (const row of rows) {
    if (sections.length > 0 && size + row.text.length > SECTIONS_PAGE_MAX_CHARS) break;
    sections.push(row);
    size += row.text.length;
  }

  const last = sections[sections.length - 1];
  const mayHaveMore = sections.length < rows.length || rows.length === limit;
  return { sections, next_after: mayHaveMore && last ? last.spine_index : null };
}

/** Idempotent upload of embedded chunks (unique on book, spine_index, chunk_index). */
export async function upsertBookChunks(bookId: string, chunks: InternalChunk[]): Promise<{ stored: number }> {
  const [book] = await db.select({ index_status: books.index_status }).from(books).where(eq(books.id, bookId));
  if (!book) throw new ServiceError('NOT_FOUND', 'Book not found');
  if (book.index_status !== 'indexing') {
    throw new ServiceError('UNAVAILABLE', 'Indexing has not been started for this book');
  }

  const sectionIds = [...new Set(chunks.map((chunk) => chunk.section_id))];
  const owned = await db
    .select({ id: bookSections.id })
    .from(bookSections)
    .where(and(eq(bookSections.book_id, bookId), inArray(bookSections.id, sectionIds)));
  if (owned.length !== sectionIds.length) throw new ServiceError('VALIDATION_ERROR', 'Unknown section for this book');

  await db
    .insert(bookChunks)
    .values(chunks.map((chunk) => ({ book_id: bookId, ...chunk })))
    .onConflictDoUpdate({
      target: [bookChunks.book_id, bookChunks.spine_index, bookChunks.chunk_index],
      set: {
        section_id: sql`excluded.section_id`,
        text: sql`excluded.text`,
        embedding: sql`excluded.embedding`,
      },
    });

  // Heartbeat: a live run keeps the claim fresh so only a dead one goes stale.
  await db.update(books).set({ updated_at: new Date() }).where(eq(books.id, bookId));
  return { stored: chunks.length };
}

export async function completeBookIndex(bookId: string, fingerprint: string, chunkCount: number): Promise<void> {
  const [stored] = await db.select({ total: count() }).from(bookChunks).where(eq(bookChunks.book_id, bookId));
  const total = stored?.total ?? 0;
  if (total !== chunkCount) {
    throw new ServiceError('VALIDATION_ERROR', `Chunk count mismatch (${total} stored, ${chunkCount} reported)`);
  }

  const [updated] = await db
    .update(books)
    .set({ index_status: 'ready', index_fingerprint: fingerprint, updated_at: new Date() })
    .where(and(eq(books.id, bookId), eq(books.index_status, 'indexing')))
    .returning({ id: books.id });
  if (!updated) throw new ServiceError('UNAVAILABLE', 'Indexing is not running for this book');
}

/** Only fails a run that is still in progress, so a late report never clobbers a newer ready index. */
export async function failBookIndex(bookId: string): Promise<void> {
  await assertBookExists(bookId);
  await db
    .update(books)
    .set({ index_status: 'failed', updated_at: new Date() })
    .where(and(eq(books.id, bookId), eq(books.index_status, 'indexing')));
}

// ── Retrieval (called by the Python service on behalf of a user) ─────────────

export async function searchBookChunks(
  userId: string,
  input: { book_id: string; embedding: number[]; spine_limit: number | null; limit: number }
): Promise<SearchResult> {
  const book = await getOwnedBook(userId, input.book_id);
  if (book.status !== 'ready') throw new ServiceError('UNAVAILABLE', 'Book is not ready yet');
  if (book.index_status !== 'ready') {
    return { index_status: book.index_status, index_fingerprint: book.index_fingerprint, chunks: [] };
  }

  const distance = cosineDistance(bookChunks.embedding, input.embedding);
  const chunks = await db
    .select({
      id: bookChunks.id,
      spine_index: bookChunks.spine_index,
      chunk_index: bookChunks.chunk_index,
      section_title: bookSections.title,
      href: bookSections.href,
      text: bookChunks.text,
      distance: sql<number>`${distance}`,
    })
    .from(bookChunks)
    .innerJoin(bookSections, eq(bookSections.id, bookChunks.section_id))
    .where(and(
      eq(bookChunks.book_id, book.id),
      input.spine_limit === null ? undefined : lte(bookChunks.spine_index, input.spine_limit),
    ))
    .orderBy(distance)
    .limit(input.limit);

  return { index_status: 'ready', index_fingerprint: book.index_fingerprint, chunks };
}

/**
 * Chunks of a range of sections in reading order, evenly sampled down to `max_chunks` so a long
 * chapter (or everything read so far) is covered end to end. Same ownership and spoiler rules as search.
 */
export async function listBookPassages(
  userId: string,
  input: { book_id: string; spine_from: number; spine_to: number | null; spine_limit: number | null; max_chunks: number }
): Promise<SearchResult> {
  const book = await getOwnedBook(userId, input.book_id);
  if (book.status !== 'ready') throw new ServiceError('UNAVAILABLE', 'Book is not ready yet');
  if (book.index_status !== 'ready') {
    return { index_status: book.index_status, index_fingerprint: book.index_fingerprint, chunks: [] };
  }

  const bounds = [input.spine_to, input.spine_limit].filter((value): value is number => value !== null);
  const upper = bounds.length > 0 ? Math.min(...bounds) : null;
  if (upper !== null && upper < input.spine_from) {
    return { index_status: 'ready', index_fingerprint: book.index_fingerprint, chunks: [] };
  }

  // Ids first (cheap), then the text of the sampled ones only.
  const order = await db
    .select({ id: bookChunks.id })
    .from(bookChunks)
    .where(and(
      eq(bookChunks.book_id, book.id),
      gte(bookChunks.spine_index, input.spine_from),
      upper === null ? undefined : lte(bookChunks.spine_index, upper),
    ))
    .orderBy(asc(bookChunks.spine_index), asc(bookChunks.chunk_index));
  const picked = sampleEvenly(order, input.max_chunks).map((row) => row.id);
  if (picked.length === 0) return { index_status: 'ready', index_fingerprint: book.index_fingerprint, chunks: [] };

  const chunks = await db
    .select({
      id: bookChunks.id,
      spine_index: bookChunks.spine_index,
      chunk_index: bookChunks.chunk_index,
      section_title: bookSections.title,
      href: bookSections.href,
      text: bookChunks.text,
    })
    .from(bookChunks)
    .innerJoin(bookSections, eq(bookSections.id, bookChunks.section_id))
    .where(inArray(bookChunks.id, picked))
    .orderBy(asc(bookChunks.spine_index), asc(bookChunks.chunk_index));

  return {
    index_status: 'ready',
    index_fingerprint: book.index_fingerprint,
    chunks: chunks.map((chunk) => ({ ...chunk, distance: 0 })),
  };
}

/** `count` items spread over the whole list (first and last included), in their original order. */
function sampleEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  if (count === 1) return [items[0]];
  const step = (items.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => items[Math.round(index * step)]);
}

// ── Asking (called by the public ask route) ──────────────────────────────────

/** True when nothing is indexing it (or the run died) and a new index job should be queued. */
function needsQueueing(book: Pick<Book, 'index_status' | 'updated_at'>): boolean {
  if (book.index_status === 'pending' || book.index_status === 'failed') return true;
  return book.index_status === 'indexing' && Date.now() - book.updated_at.getTime() > INDEX_STALE_MS;
}

/** Spine index of the section being read (the reader reports its href relative to the OPF), or null. */
async function currentSpineFor(bookId: string, positionHref: string | null | undefined): Promise<number | null> {
  const target = positionHref ? safeDecode(positionHref.split('#')[0]) : '';
  if (!target) return null;
  const sections = await db
    .select({ href: bookSections.href, spine_index: bookSections.spine_index })
    .from(bookSections)
    .where(eq(bookSections.book_id, bookId));
  const match = sections.find((section) => section.href === target || section.href.endsWith(`/${target}`));
  if (!match) console.warn('[getAskContext] reading position does not match any section', { bookId });
  return match?.spine_index ?? null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // a literal "%" in a file name
  }
}

export async function getAskContext(
  userId: string,
  bookId: string,
  input: { scope: 'read' | 'all'; position_href?: string | null }
): Promise<AskContext> {
  const book = await getOwnedBook(userId, bookId);
  if (book.status !== 'ready') throw new ServiceError('UNAVAILABLE', 'Book is not ready yet');

  const indexReady = book.index_status === 'ready';
  const currentSpine = await currentSpineFor(book.id, input.position_href);
  return {
    book: { title: book.title, author: book.author, language: book.language },
    // With no resolvable position the answer is limited to the first section, never the whole book:
    // an unknown position must not leak spoilers.
    spine_limit: input.scope === 'read' ? currentSpine ?? 0 : null,
    current_spine: currentSpine,
    index_ready: indexReady,
    needs_index: !indexReady && needsQueueing(book),
  };
}

async function assertBookExists(bookId: string): Promise<void> {
  const [book] = await db.select({ id: books.id }).from(books).where(eq(books.id, bookId));
  if (!book) throw new ServiceError('NOT_FOUND', 'Book not found');
}
