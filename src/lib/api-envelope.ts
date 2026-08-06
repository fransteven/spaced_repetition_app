/**
 * Every API route answers with `{ data, error: { code, message } | null }`.
 * Each dialog used to re-implement this unwrap inline; keep it in one place.
 */
export function unwrapError(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) return fallback;

  const error = (payload as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return fallback;

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.length > 0 ? message : fallback;
}
