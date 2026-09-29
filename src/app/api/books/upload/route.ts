import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/lib/auth';
import { EPUB_CONTENT_TYPE, MAX_BOOK_SIZE_BYTES, isOwnBookPathname } from '@/lib/books/limits';
import { assertCanAddBook } from '@/lib/services/book-service';
import { NextResponse } from 'next/server';
import { fail, failFromError } from '@/lib/api-response';

// Issues a short-lived client token so the browser uploads the EPUB straight
// to Vercel Blob. Completion is confirmed explicitly via POST /api/books.
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');
  const userId = session.user.id;

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid upload request');
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isOwnBookPathname(userId, pathname)) throw new Error('Invalid upload path');
        await assertCanAddBook(userId);
        return {
          allowedContentTypes: [EPUB_CONTENT_TYPE],
          maximumSizeInBytes: MAX_BOOK_SIZE_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    // Raw payload on purpose: the @vercel/blob client reads `clientToken` from
    // the top level of this response, so it can't use the { data, error } envelope.
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid upload path') {
      return fail('FORBIDDEN', error.message);
    }
    return failFromError(error, '[POST /api/books/upload]', 'Failed to start upload');
  }
}
