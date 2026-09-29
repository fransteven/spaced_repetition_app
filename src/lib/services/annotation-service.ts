import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bookAnnotations } from '@/lib/db/schema';
import { assertBookOwnership } from '@/lib/services/book-service';
import { ServiceError } from '@/lib/services/service-error';

export type BookAnnotation = InferSelectModel<typeof bookAnnotations>;
type HighlightColor = BookAnnotation['color'];

async function assertAnnotationOwnership(userId: string, annotationId: string): Promise<void> {
  const [row] = await db
    .select({ user_id: bookAnnotations.user_id })
    .from(bookAnnotations)
    .where(eq(bookAnnotations.id, annotationId));
  if (!row) throw new ServiceError('NOT_FOUND', 'Annotation not found');
  if (row.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');
}

export async function createAnnotation(
  userId: string,
  input: {
    book_id: string;
    cfi_range: string;
    quote: string;
    chapter_label?: string | null;
    color: HighlightColor;
    note?: string | null;
  }
): Promise<BookAnnotation> {
  await assertBookOwnership(userId, input.book_id);
  const [annotation] = await db
    .insert(bookAnnotations)
    .values({ ...input, note: input.note?.trim() || null, user_id: userId })
    .returning();
  return annotation;
}

export async function updateAnnotation(
  userId: string,
  annotationId: string,
  input: { color?: HighlightColor; note?: string | null }
): Promise<BookAnnotation> {
  await assertAnnotationOwnership(userId, annotationId);
  const note = input.note === undefined ? undefined : input.note?.trim() || null;
  const [annotation] = await db
    .update(bookAnnotations)
    .set({ color: input.color, note, updated_at: new Date() })
    .where(eq(bookAnnotations.id, annotationId))
    .returning();
  return annotation;
}

export async function deleteAnnotation(userId: string, annotationId: string): Promise<void> {
  await assertAnnotationOwnership(userId, annotationId);
  await db.delete(bookAnnotations).where(eq(bookAnnotations.id, annotationId));
}
