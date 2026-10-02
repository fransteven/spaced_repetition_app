import type { NextResponse } from 'next/server';
import { fail, failFromError, ok } from '@/lib/api-response';
import { rejectUnlessInternal } from '@/lib/internal-service-auth';
import { listSectionsPage } from '@/lib/services/book-index-service';
import { BookIdSchema, InternalSectionsQuerySchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** Pages through a book's plain-text sections (cursor = spine_index) for indexing. */
export async function GET(request: Request, { params }: Params): Promise<NextResponse> {
  const rejected = rejectUnlessInternal(request);
  if (rejected) return rejected;

  const bookId = BookIdSchema.safeParse((await params).id);
  if (!bookId.success) return fail('VALIDATION_ERROR', 'Invalid book id');
  const query = InternalSectionsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return fail('VALIDATION_ERROR', query.error.message);

  try {
    return ok(await listSectionsPage(bookId.data, query.data.after, query.data.limit));
  } catch (error) {
    return failFromError(error, '[GET /api/internal/rag/books/[id]/sections]', 'Could not read sections');
  }
}
