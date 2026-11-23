'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const SW_ENABLED =
  process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === '1';

/**
 * Registers the offline service worker (`/sw.js`, src/app/sw.js/route.ts). Production only, or in dev
 * with NEXT_PUBLIC_ENABLE_SW=1. A new worker waits until the next in-app navigation and is then told
 * to take over (SKIP_WAITING), so it never swaps assets under a page mid-interaction.
 */
export function ServiceWorkerRegister(): null {
  const pathname = usePathname();
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (!SW_ENABLED || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        if (!cancelled) registration.current = reg;
      })
      .catch((error: unknown) => {
        console.error('[service-worker] registration failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const waiting = registration.current?.waiting;
    if (waiting && navigator.serviceWorker.controller) waiting.postMessage('SKIP_WAITING');
  }, [pathname]);

  return null;
}
