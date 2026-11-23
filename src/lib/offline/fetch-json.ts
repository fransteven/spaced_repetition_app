// Small fetch helpers for the `{ data, error }` envelope (browser only).
import type { ApiEnvelope } from './types';

/** A response that arrived but was not a success (the network itself worked). */
export class OfflineHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'OfflineHttpError';
    this.status = status;
    this.code = code;
  }
}

/** Parses an envelope body; never throws on malformed JSON (returns an INTERNAL_ERROR envelope). */
export async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return { data: null, error: { code: 'INTERNAL_ERROR', message: `Unexpected response (${response.status})` } };
  }
}

/** fetch + envelope: resolves `data`, throws OfflineHttpError on any error envelope / non-2xx. */
export async function fetchEnvelope<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: 'same-origin', ...init });
  const body = await readEnvelope<T>(response);
  if (!response.ok || body.error || body.data === null) {
    throw new OfflineHttpError(
      response.status,
      body.error?.code ?? 'INTERNAL_ERROR',
      body.error?.message ?? `Request failed (${response.status})`
    );
  }
  return body.data;
}
