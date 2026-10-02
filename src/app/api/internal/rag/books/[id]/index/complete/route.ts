import type { NextResponse } from 'next/server';
import { fail, failFromError, ok } from '@/lib/api-response';
import { rejectUnlessInternal } from '@/lib/internal-service-auth';
import { completeBookIndex } from '@/lib/services/book-index-service';
import { BookIdSchema, InternalIndexCompleteSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** Marks the index ready after checking that the stored chunk count matches what the indexer sent. */
export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const rejected = rejectUnlessInternal(request);
  if (rejected) return rejected;

  const bookId = BookIdSchema.safeParse((await params).id);
  if (!bookId.success) return fail('VALIDATION_ERROR', 'Invalid book id');
  const parsed = InternalIndexCompleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    await completeBookIndex(bookId.data, parsed.data.fingerprint, parsed.data.chunk_count);
    return ok({ id: bookId.data });
  } catch (error) {
    return failFromError(error, '[POST /api/internal/rag/books/[id]/index/complete]', 'Could not finish indexing');
  }
}
