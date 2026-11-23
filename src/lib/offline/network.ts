// Detects "the request never reached the server" failures (browser + node).

const NETWORK_MESSAGES = ['failed to fetch', 'load failed', 'networkerror', 'network request failed', 'fetch failed'];

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * True for failures where retrying later makes sense because nothing reached the server:
 * fetch TypeErrors ("Failed to fetch" in Chrome, "Load failed" in Safari, "NetworkError…" in
 * Firefox), and any error thrown while the browser reports being offline. Aborts are not.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (isBrowserOffline()) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (NETWORK_MESSAGES.some((m) => message.includes(m))) return true;
  return error instanceof TypeError && message.includes('fetch');
}
