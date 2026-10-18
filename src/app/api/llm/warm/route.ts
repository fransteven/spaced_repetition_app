import { after, type NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fail, ok } from '@/lib/api-response';
import { warmLlmService } from '@/lib/llm-client';

// The wake-up runs after the response and may wait for a cold start (LLM_WAKE_TIMEOUT_MS, 90 s).
export const maxDuration = 120;

/**
 * Keep-alive for the AI service while a book is open. Free hosting (Render) stops srs-llm-api after 15 idle
 * minutes; the reader pings this route every few minutes so a translation or a question never waits for a
 * cold start. Answers at once: the probe of `/health` runs after the response.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  after(() =>
    warmLlmService({ force: true }).catch((error: unknown) => console.warn('[POST /api/llm/warm]', error))
  );
  return ok({ status: 'warming' }, 202);
}
