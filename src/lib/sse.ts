import { AskStreamEventSchema, type AskStreamEvent } from '@/lib/rag/ask-types';

export interface SseMessage {
  event: string;
  data: string;
}

function parseBlock(block: string): SseMessage | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line === '' || line.startsWith(':')) continue; // blank lines and comments (keep-alive pings)
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return data.length > 0 ? { event, data: data.join('\n') } : null;
}

/** Reads a Server-Sent Events body (fetch streaming) and yields one message per event. */
export async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      // A lone trailing \r may be the first half of a \r\n split across chunks: it is resolved next round.
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
      for (let boundary = buffer.indexOf('\n\n'); boundary !== -1; boundary = buffer.indexOf('\n\n')) {
        const message = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (message) yield message;
      }
    }
    const last = parseBlock((buffer + decoder.decode()).replace(/\r\n?/g, '\n'));
    if (last) yield last;
  } finally {
    reader.releaseLock();
  }
}

/** Validates one message as an ask-stream event; unknown or malformed events are skipped. */
export function parseAskEvent(message: SseMessage): AskStreamEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(message.data);
  } catch {
    return null;
  }
  const parsed = AskStreamEventSchema.safeParse({ event: message.event, data });
  return parsed.success ? parsed.data : null;
}
