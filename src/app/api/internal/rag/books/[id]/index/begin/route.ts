import type { NextResponse } from 'next/server';
import { fail, failFromError, ok } from '@/lib/api-response';
import { rejectUnlessInternal } from '@/lib/internal-service-auth';
import { beginBookIndex } from '@/lib/services/book-index-service';
import { BookIdSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** Claims the index for a book (409 if a live run already holds it) and clears its old chunks. */
export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const rejected = rejectUnlessInternal(request);
  if (rejected) return rejected;

  const bookId = BookIdSchema.safeParse((await params).id);
  if (!bookId.success) return fail('VALIDATION_ERROR', 'Invalid book id');

  try {
    return ok(await beginBookIndex(bookId.data));
  } catch (error) {
    return failFromError(error, '[POST /api/internal/rag/books/[id]/index/begin]', 'Could not start indexing');
  }
}
