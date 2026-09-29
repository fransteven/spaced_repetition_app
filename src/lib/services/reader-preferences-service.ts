import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { readerPreferences } from '@/lib/db/schema';
import type { ReaderPreferencesInput } from '@/lib/validations';

export type ReaderPreferences = Omit<InferSelectModel<typeof readerPreferences>, 'user_id' | 'updated_at'>;

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  font_scale: 1,
  font_family: 'book',
  line_height: 1.55,
  justify: false,
  theme: 'sepia',
};

export async function getReaderPreferences(userId: string): Promise<ReaderPreferences> {
  const [row] = await db.select().from(readerPreferences).where(eq(readerPreferences.user_id, userId));
  if (!row) return DEFAULT_READER_PREFERENCES;
  return {
    font_scale: row.font_scale,
    font_family: row.font_family,
    line_height: row.line_height,
    justify: row.justify,
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
