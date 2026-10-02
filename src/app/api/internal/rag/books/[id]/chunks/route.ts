import type { NextResponse } from 'next/server';
import { fail, failFromError, ok } from '@/lib/api-response';
import { rejectUnlessInternal } from '@/lib/internal-service-auth';
import { upsertBookChunks } from '@/lib/services/book-index-service';
import { BookIdSchema, InternalChunksSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** Uploads up to 100 embedded chunks. Idempotent: a retried batch overwrites itself. */
export async function PUT(request: Request, { params }: Params): Promise<NextResponse> {
  const rejected = rejectUnlessInternal(request);
  if (rejected) return rejected;

  const bookId = BookIdSchema.safeParse((await params).id);
  if (!bookId.success) return fail('VALIDATION_ERROR', 'Invalid book id');
  const parsed = InternalChunksSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    return ok(await upsertBookChunks(bookId.data, parsed.data.chunks));
  } catch (error) {
    return failFromError(error, '[PUT /api/internal/rag/books/[id]/chunks]', 'Could not store chunks');
  }
}
