import type { NextResponse } from 'next/server';
import { fail, failFromError, ok } from '@/lib/api-response';
import { rejectUnlessInternal } from '@/lib/internal-service-auth';
import { listChunkNeighbors } from '@/lib/services/book-index-service';
import { InternalNeighborsSchema } from '@/lib/validations';

/** Chunks around retrieved ones (same section), so the answer sees the surrounding paragraphs. Called by srs-llm-api. */
export async function POST(request: Request): Promise<NextResponse> {
  const rejected = rejectUnlessInternal(request);
  if (rejected) return rejected;

  const parsed = InternalNeighborsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    const { user_id, ...input } = parsed.data;
    return ok(await listChunkNeighbors(user_id, input));
  } catch (error) {
    return failFromError(error, '[POST /api/internal/rag/neighbors]', 'Neighbour lookup failed');
  }
}
