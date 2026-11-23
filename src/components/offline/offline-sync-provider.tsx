'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { checkOwner } from '@/lib/offline/storage';
import { refreshPendingCount, startAutoSync, subscribe } from '@/lib/offline/sync';
import { resetDownloads } from '@/components/offline/download-store';

/**
 * Background wiring of the offline layer (mount once, inside SessionProvider):
 * - starts the outbox auto-sync (start, online, tab visible, interval);
 * - wipes downloads that belong to another account once the session is known. Never on a
 *   null / unauthenticated session: offline the session request fails and reports that too;
 * - tells the user when synced reviews lost to newer ones from another device.
 */
export function OfflineSyncProvider(): null {
  const { data: session, status } = useSession();
  const userId = status === 'authenticated' ? session?.user?.id : undefined;
  const lastToasted = useRef<string | null>(null);

  // Auto-sync starts only once the account is known to own the queued changes: when signed in,
  // after the owner check (so another account's queue is wiped, never sent under this session);
  // when the session is unknown (offline), right away — flushes then skip or fail UNAUTHORIZED and keep the items.
  useEffect(() => {
    if (status === 'loading') return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    const ownerChecked = userId
      ? checkOwner(userId)
          .then(async (wiped) => {
            if (!wiped || cancelled) return;
            await resetDownloads();
            await refreshPendingCount();
          })
          .catch((error: unknown) => {
            console.warn('[offline] owner check failed', error);
          })
      : Promise.resolve();
    void ownerChecked.then(() => {
      if (!cancelled) stop = startAutoSync();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [status, userId]);

  useEffect(
    () =>
      subscribe(({ lastResult }) => {
        if (!lastResult || lastResult.finished_at === lastToasted.current) return;
        lastToasted.current = lastResult.finished_at;
        if (lastResult.stale > 0) {
          const n = lastResult.stale;
          toast.info(
            n === 1
              ? '1 offline review was discarded: another device reviewed that card more recently'
              : `${n} offline reviews were discarded: another device reviewed those cards more recently`
          );
        }
      }),
    []
  );

  return null;
}
