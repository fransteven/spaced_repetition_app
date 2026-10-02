import type { NextResponse } from 'next/server';
import { fail, failFromError, ok } from '@/lib/api-response';
import { rejectUnlessInternal } from '@/lib/internal-service-auth';
import { failBookIndex } from '@/lib/services/book-index-service';
import { BookIdSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** Marks a run that is still in progress as failed. Best-effort report from the indexer. */
export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const rejected = rejectUnlessInternal(request);
  if (rejected) return rejected;

  const bookId = BookIdSchema.safeParse((await params).id);
  if (!bookId.success) return fail('VALIDATION_ERROR', 'Invalid book id');

  try {
    await failBookIndex(bookId.data);
    return ok({ id: bookId.data });
  } catch (error) {
    return failFromError(error, '[POST /api/internal/rag/books/[id]/index/fail]', 'Could not record the failure');
  }
}
