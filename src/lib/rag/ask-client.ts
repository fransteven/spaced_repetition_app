import {
  ApiErrorReplySchema,
  AskIndexingReplySchema,
  type AskSource,
  type AskStage,
} from '@/lib/rag/ask-types';
import { parseAskEvent, readSse } from '@/lib/sse';

/** Browser side of "Ask this book": one request to the ask route, reading its event stream. */

export interface AskTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskRequestInput {
  bookId: string;
  question: string;
  history: AskTurn[];
  scope: 'read' | 'all';
  positionHref: string | null;
}

export interface AskHandlers {
  onStage: (stage: AskStage) => void;
  onToken: (text: string) => void;
}

export type AskOutcome =
  | { kind: 'final'; answer: string; answerable: boolean; sources: AskSource[] }
  | { kind: 'indexing' }
  | { kind: 'error'; message: string };

const GENERIC_ERROR = 'Could not answer. Try again.';

/**
 * Sends the question and reports progress through the handlers. Resolves with the authoritative result:
 * the streamed tokens are only a preview and the `final` event replaces them. Rejects only when `signal`
 * aborts, so callers can tell a cancelled request from a failed one.
 */
export async function requestAnswer(
  input: AskRequestInput,
  handlers: AskHandlers,
  signal: AbortSignal
): Promise<AskOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/books/${input.bookId}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: input.question,
        history: input.history,
        scope: input.scope,
        position_href: input.positionHref,
      }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return { kind: 'error', message: 'Could not reach the server. Check your connection.' };
  }

  if (!(response.headers.get('content-type') ?? '').includes('text/event-stream') || !response.body) {
    const json: unknown = await response.json().catch(() => null);
    if (AskIndexingReplySchema.safeParse(json).success) return { kind: 'indexing' };
    const failure = ApiErrorReplySchema.safeParse(json);
    return { kind: 'error', message: failure.success ? failure.data.error.message : GENERIC_ERROR };
  }

  try {
    for await (const message of readSse(response.body)) {
      const event = parseAskEvent(message);
      if (!event) continue;
      switch (event.event) {
        case 'status':
          handlers.onStage(event.data.stage);
          break;
        case 'token':
          handlers.onToken(event.data.text);
          break;
        case 'final':
          return { kind: 'final', ...event.data };
        case 'indexing':
          return { kind: 'indexing' };
        case 'error':
          return { kind: 'error', message: event.data.message };
      }
    }
  } catch (error) {
    if (signal.aborted) throw error;
    return { kind: 'error', message: 'The answer was interrupted. Try again.' };
  }
  return { kind: 'error', message: 'The answer was interrupted. Try again.' };
}
