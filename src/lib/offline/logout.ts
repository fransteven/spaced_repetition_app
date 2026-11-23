// Shared sign-out (browser only): send what can be sent, wipe this device's offline data, then
// end the session. Replaces direct signOut() calls so the next account never sees our downloads.
import { signOut } from 'next-auth/react';

import { count } from './outbox';
import { wipeAll } from './storage';
import { flush } from './sync';

export const LOGOUT_FLUSH_TIMEOUT_MS = 5_000;
const WIPE_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('timeout'), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Best-effort flush (bounded by `timeoutMs`). Returns how many changes are still unsent. */
export async function flushBeforeLogout(timeoutMs = LOGOUT_FLUSH_TIMEOUT_MS): Promise<number> {
  try {
    if ((await withTimeout(flush({ force: true }), timeoutMs)) === 'timeout') {
      console.warn('[offline] logout: flush timed out');
    }
  } catch (error) {
    console.warn('[offline] logout: flush failed', error);
  }
  try {
    return await count();
  } catch {
    return 0; // IndexedDB unavailable: nothing was ever queued
  }
}

/** Wipes the offline data (never blocks sign-out for long), then signs out. */
export async function completeLogout(): Promise<void> {
  try {
    if ((await withTimeout(wipeAll(), WIPE_TIMEOUT_MS)) === 'timeout') {
      console.warn('[offline] logout: wipe timed out');
    }
  } catch (error) {
    console.error('[offline] logout: wipe failed', error);
  }
  await signOut({ callbackUrl: '/login' });
}

/** flush (≤ 5 s) → wipeAll → signOut, without asking. UI callers confirm unsent changes first (useLogout). */
export async function logout(): Promise<void> {
  await flushBeforeLogout();
  await completeLogout();
}
