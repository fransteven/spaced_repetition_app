import { and, eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bookBookmarks } from '@/lib/db/schema';
import { assertBookOwnership } from '@/lib/services/book-service';
import { ServiceError } from '@/lib/services/service-error';

export type BookBookmark = InferSelectModel<typeof bookBookmarks>;

/** Adds a bookmark at a page. Bookmarking the same page twice returns the existing one. */
export async function createBookmark(
  userId: string,
  input: { book_id: string; cfi: string; chapter_label?: string | null; excerpt?: string | null; progress: number }
): Promise<BookBookmark> {
  await assertBookOwnership(userId, input.book_id);
  const [created] = await db
    .insert(bookBookmarks)
    .values({ ...input, excerpt: input.excerpt?.trim() || null, user_id: userId })
    .onConflictDoNothing({ target: [bookBookmarks.book_id, bookBookmarks.cfi] })
    .returning();
  if (created) return created;

  const [existing] = await db
    .select()
    .from(bookBookmarks)
    .where(and(eq(bookBookmarks.book_id, input.book_id), eq(bookBookmarks.cfi, input.cfi)));
  return existing;
}

export async function deleteBookmark(userId: string, bookmarkId: string): Promise<void> {
  const [row] = await db
    .select({ user_id: bookBookmarks.user_id })
    .from(bookBookmarks)
    .where(eq(bookBookmarks.id, bookmarkId));
  if (!row) throw new ServiceError('NOT_FOUND', 'Bookmark not found');
  if (row.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');
  await db.delete(bookBookmarks).where(eq(bookBookmarks.id, bookmarkId));
}
