import type { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DictionaryLookupSchema } from '@/lib/validations';
import { lookupDefinition } from '@/lib/services/dictionary-service';
import { fail, failFromError, ok } from '@/lib/api-response';

// Definition of one selected word for the reader's lookup panel (free, no LLM call).
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  const params = new URL(request.url).searchParams;
  const parsed = DictionaryLookupSchema.safeParse({ word: params.get('word'), lang: params.get('lang') });
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    const result = await lookupDefinition(parsed.data.word, parsed.data.lang ?? null);
    const response = ok(result);
    response.headers.set('Cache-Control', 'private, max-age=86400');
    return response;
  } catch (error) {
    return failFromError(error, '[GET /api/dictionary]', 'Dictionary unavailable');
  }
}
