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
    id?: string; // client-generated (offline mode): a retried create returns the existing row
    book_id: string;
    cfi_range: string;
    quote: string;
    chapter_label?: string | null;
    color: HighlightColor;
    note?: string | null;
  }
): Promise<BookAnnotation> {
  await assertBookOwnership(userId, input.book_id);
  const values = { ...input, note: input.note?.trim() || null, user_id: userId };
  if (input.id === undefined) {
    const [annotation] = await db.insert(bookAnnotations).values(values).returning();
    return annotation;
  }

  const [created] = await db
    .insert(bookAnnotations)
    .values(values)
    .onConflictDoNothing({ target: bookAnnotations.id })
    .returning();
  if (created) return created;

  const [existing] = await db.select().from(bookAnnotations).where(eq(bookAnnotations.id, input.id));
  if (!existing) throw new ServiceError('NOT_FOUND', 'Annotation not found'); // deleted in between
  if (existing.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');
  return existing;
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
