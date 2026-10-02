import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { books, translationCache } from '@/lib/db/schema';
import { callLlmService } from '@/lib/llm-client';
import { assertBookOwnership } from '@/lib/services/book-service';
import { reserveLlmCall } from '@/lib/services/llm-usage-service';
import { AUTO_DETECT, toLanguageCode, type LanguageCode } from '@/lib/translation/languages';

export interface TranslationResult {
  translation: string;
  source_lang: string;       // detected when `from` was auto
  target_lang: LanguageCode;
  cached: boolean;
}

// Reply of srs-llm-api (POST /v1/llm/translate), which owns the prompt and the OpenAI call.
const TranslateReplySchema = z.object({
  source_language: z.string().min(2).max(10),
  translation: z.string().min(1).max(20_000),
});

function cacheKey(from: string, to: string, text: string): string {
  return createHash('sha256').update(`${from}\u0000${to}\u0000${text}`).digest('hex');
}

export async function translateSelection(
  userId: string,
  input: { book_id: string; text: string; context?: string | null; from: string; to: LanguageCode }
): Promise<TranslationResult> {
  await assertBookOwnership(userId, input.book_id);

  const text = input.text.trim();
  const from = input.from === AUTO_DETECT ? AUTO_DETECT : (toLanguageCode(input.from) ?? AUTO_DETECT);
  const key = cacheKey(from, input.to, text);

  // Remember the pair so the panel reopens with it for this book.
  await db
    .update(books)
    .set({ translate_from: from === AUTO_DETECT ? null : from, translate_to: input.to })
    .where(and(eq(books.id, input.book_id), eq(books.user_id, userId)));

  const [hit] = await db.select().from(translationCache).where(eq(translationCache.key, key));
  if (hit) {
    return { translation: hit.translation, source_lang: hit.source_lang, target_lang: input.to, cached: true };
  }

  // Only a cache miss costs a paid call, so only a miss counts against the daily cap.
  await reserveLlmCall(userId, 'translate');
  const output = await callLlmService(
    '/v1/llm/translate',
    { text, context: input.context?.trim() || null, source_lang: from, target_lang: input.to },
    TranslateReplySchema
  );

  const sourceLang = from === AUTO_DETECT ? (toLanguageCode(output.source_language) ?? output.source_language.toLowerCase()) : from;
  const translation = output.translation.trim();

  await db
    .insert(translationCache)
    .values({ key, source_lang: sourceLang, target_lang: input.to, translation })
    .onConflictDoNothing({ target: translationCache.key });

  return { translation, source_lang: sourceLang, target_lang: input.to, cached: false };
}
