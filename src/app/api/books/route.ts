import type { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { inngest } from '@/inngest/client';
import { ConfirmBookUploadSchema } from '@/lib/validations';
import { confirmBookUpload, listBooksForUser } from '@/lib/services/book-service';
import { fail, failFromError, ok } from '@/lib/api-response';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  try {
    return ok(await listBooksForUser(session.user.id));
  } catch (error) {
    return failFromError(error, '[GET /api/books]', 'Failed to fetch books');
  }
}

// Confirms a finished client upload, creates the book and queues processing.
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  const parsed = ConfirmBookUploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    const book = await confirmBookUpload(session.user.id, parsed.data);
    await inngest.send({ name: 'app/book.uploaded', data: { bookId: book.id } });
    return ok(book, 201);
  } catch (error) {
    return failFromError(error, '[POST /api/books]', 'Failed to add book');
  }
}
