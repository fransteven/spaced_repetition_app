'use client';

import { useEffect } from 'react';

// Render's free plan stops the AI service after 15 idle minutes: ping well within that window.
const PING_INTERVAL_MS = 8 * 60_000;
// A tab left open on a book must not keep the service up forever.
const MAX_KEEP_ALIVE_MS = 3 * 60 * 60_000;

/** Whether a keep-alive ping is due: tab visible, within the session cap and the last ping is stale. */
export function keepAlivePingDue(input: { now: number; lastPing: number; mountedAt: number; visible: boolean }): boolean {
  const { now, lastPing, mountedAt, visible } = input;
  return visible && now - mountedAt <= MAX_KEEP_ALIVE_MS && now - lastPing >= PING_INTERVAL_MS;
}

function ping(): void {
  void fetch('/api/llm/warm', { method: 'POST', keepalive: true }).catch(() => undefined);
}

/**
 * Keeps the AI service awake while the reader is open and visible, so translating, suggesting a card or
 * asking the book never waits for a cold start mid-reading. The page itself already wakes it on load.
 * Pauses while the tab is hidden and pings again on return if the last ping is stale.
 */
export function KeepAiAwake(): null {
  useEffect(() => {
    const mountedAt = Date.now();
    let lastPing = Date.now(); // the page wakes the service while it loads

    const maybePing = (): void => {
      const now = Date.now();
      if (!keepAlivePingDue({ now, lastPing, mountedAt, visible: document.visibilityState === 'visible' })) return;
      lastPing = now;
      ping();
    };

    const timer = window.setInterval(maybePing, 60_000);
    document.addEventListener('visibilitychange', maybePing);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', maybePing);
    };
  }, []);

  return null;
}
