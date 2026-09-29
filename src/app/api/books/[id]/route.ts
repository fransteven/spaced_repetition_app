import type { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UpdateBookSchema } from '@/lib/validations';
import { deleteBook, updateBookMetadata } from '@/lib/services/book-service';
import { fail, failFromError, ok } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  const { id } = await params;
  const parsed = UpdateBookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    return ok(await updateBookMetadata(session.user.id, id, parsed.data));
  } catch (error) {
    return failFromError(error, '[PATCH /api/books/[id]]', 'Failed to update book');
  }
}

export async function DELETE(_request: Request, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  const { id } = await params;
  try {
    await deleteBook(session.user.id, id);
    return ok({ id });
  } catch (error) {
    return failFromError(error, '[DELETE /api/books/[id]]', 'Failed to delete book');
  }
}
