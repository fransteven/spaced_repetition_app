import type { NextResponse } from 'next/server';
import { fail, failFromError, ok } from '@/lib/api-response';
import { rejectUnlessInternal } from '@/lib/internal-service-auth';
import { searchBookChunks } from '@/lib/services/book-index-service';
import { InternalSearchSchema } from '@/lib/validations';

/** Vector search over one book's chunks, on behalf of a user. Called by srs-llm-api. */
export async function POST(request: Request): Promise<NextResponse> {
  const rejected = rejectUnlessInternal(request);
  if (rejected) return rejected;

  const parsed = InternalSearchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    const { user_id, ...input } = parsed.data;
    return ok(await searchBookChunks(user_id, input));
  } catch (error) {
    return failFromError(error, '[POST /api/internal/rag/search]', 'Search failed');
  }
}
