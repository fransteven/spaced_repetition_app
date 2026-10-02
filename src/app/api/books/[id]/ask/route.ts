import { z } from 'zod';
import type { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { inngest } from '@/inngest/client';
import { fail, failFromError, ok } from '@/lib/api-response';
import { getLlmServiceConfig } from '@/lib/llm-client';
import { getAskContext } from '@/lib/services/book-index-service';
import { reserveLlmCall } from '@/lib/services/llm-usage-service';
import { ServiceError } from '@/lib/services/service-error';
import { AskRequestSchema, BookIdSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

// Streaming answers can take a while (retrieval, grading and generation run in srs-llm-api).
export const maxDuration = 60;

const HISTORY_TURNS = 6;
const UpstreamErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

/**
 * Answers a question about a book as a Server-Sent Events stream, produced by srs-llm-api.
 * This route owns everything that needs the database: session, ownership, the reading position
 * (spoiler limit), index readiness and the daily cap. The stream itself is forwarded untouched.
 */
export async function POST(request: Request, { params }: Params): Promise<NextResponse | Response> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');
  const userId = session.user.id;

  const bookId = BookIdSchema.safeParse((await params).id);
  if (!bookId.success) return fail('NOT_FOUND', 'Book not found');
  const parsed = AskRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message);

  try {
    const context = await getAskContext(userId, bookId.data, {
      scope: parsed.data.scope,
      position_href: parsed.data.position_href,
    });

    if (!context.index_ready) {
      if (context.needs_index) {
        // Deduplicated per minute so a client polling for readiness does not queue a job per poll.
        await inngest.send({
          id: `book-index:${bookId.data}:${Math.floor(Date.now() / 60_000)}`,
          name: 'app/book.index',
          data: { bookId: bookId.data },
        });
      }
      return ok({ status: 'indexing' as const }, 202); // polling does not count against the daily cap
    }

    await reserveLlmCall(userId, 'ask');

    const { baseUrl, token } = getLlmServiceConfig();
    let upstream: Response;
    try {
      upstream = await fetch(`${baseUrl}/v1/rag/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: userId,
          book_id: bookId.data,
          book: context.book,
          question: parsed.data.question,
          history: parsed.data.history.slice(-HISTORY_TURNS),
          spine_limit: context.spine_limit,
        }),
        signal: request.signal, // the browser closing the stream cancels the run in srs-llm-api
      });
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      console.error('[POST /api/books/[id]/ask] srs-llm-api unreachable', error);
      throw new ServiceError('UNAVAILABLE', 'The AI service is unreachable. Try again in a moment.');
    }

    if (!upstream.ok || !upstream.body) {
      const reply = UpstreamErrorSchema.safeParse(await upstream.json().catch(() => null));
      console.error(`[POST /api/books/[id]/ask] srs-llm-api answered HTTP ${upstream.status}`, reply.success ? reply.data.error.code : '');
      // Only the service's own UNAVAILABLE messages are written for end users.
      const message = reply.success && reply.data.error.code === 'UNAVAILABLE' ? reply.data.error.message : 'The AI service failed. Try again in a moment.';
      throw new ServiceError('UNAVAILABLE', message);
    }

    return new Response(upstream.body, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'x-accel-buffering': 'no',
      },
    });
  } catch (error) {
    return failFromError(error, '[POST /api/books/[id]/ask]', 'Failed to answer');
  }
}
