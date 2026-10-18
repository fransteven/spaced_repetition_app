import { DEFAULT_READER_PREFERENCES, READER_SCALE_MIN, READER_SCALE_MAX } from '@/lib/reader-options';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { readerPreferences } from '@/lib/db/schema';
import type { ReaderPreferencesInput } from '@/lib/validations';

export type ReaderPreferences = Omit<InferSelectModel<typeof readerPreferences>, 'user_id' | 'updated_at'>;

export { DEFAULT_READER_PREFERENCES } from '@/lib/reader-options';

export async function getReaderPreferences(userId: string): Promise<ReaderPreferences> {
  const [row] = await db.select().from(readerPreferences).where(eq(readerPreferences.user_id, userId));
  if (!row) return DEFAULT_READER_PREFERENCES;
  return {
    // PostgreSQL real stores 0.7/1.6 a few ULPs outside the validated range.
    font_scale: Math.min(READER_SCALE_MAX, Math.max(READER_SCALE_MIN, row.font_scale)),
    font_family: row.font_family,
    line_height: row.line_height,
    justify: row.justify,
    two_pages: row.two_pages,
    theme: row.theme,
  };
}

export async function updateReaderPreferences(
  userId: string,
  input: ReaderPreferencesInput
): Promise<void> {
  await db
    .insert(readerPreferences)
    .values({ ...DEFAULT_READER_PREFERENCES, ...input, user_id: userId })
    .onConflictDoUpdate({
      target: readerPreferences.user_id,
      set: { ...input, updated_at: new Date() },
    });
}
