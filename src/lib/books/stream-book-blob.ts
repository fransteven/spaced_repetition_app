import type { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { openBlobStream } from '@/lib/blob';
import { getBookBlobPathname } from '@/lib/services/book-service';
import { fail, failFromError } from '@/lib/api-response';

/** Streams a private book file or cover after an ownership check. */
export async function streamBookBlob(bookId: string, kind: 'file' | 'cover'): Promise<Response | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  try {
    const pathname = await getBookBlobPathname(session.user.id, bookId, kind);
    const blob = await openBlobStream(pathname);
    if (!blob) return fail('NOT_FOUND', 'File not found');

    return new Response(blob.stream, {
      headers: {
        'Content-Type': blob.contentType,
        'Content-Length': String(blob.size),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return failFromError(error, `[GET /api/books/[id]/${kind}]`, 'Failed to load file');
  }
}
