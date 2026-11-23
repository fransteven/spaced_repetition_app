'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCw, WifiOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { PageSection } from '@/components/layout/page-header';
import { useSyncState } from '@/components/offline/use-sync-state';

/** Full-screen surfaces (study, reader, canvas viewer and their offline shells) keep their own chrome. */
function isImmersive(pathname: string): boolean {
  return (
    pathname.startsWith('/study') ||
    pathname.startsWith('/read') ||
    pathname.startsWith('/offline/read') ||
    pathname.startsWith('/offline/study') ||
    /^\/mind-maps\/canvases\/[^/]+$/.test(pathname)
  );
}

function changesLabel(n: number): string {
  return `${n} ${n === 1 ? 'change' : 'changes'} waiting to sync`;
}

/** Inline notice at the top of the page: offline state and/or unsynced changes. */
export function OfflineBanner({ className }: { className?: string }): React.JSX.Element | null {
  const pathname = usePathname();
  const online = useOnlineStatus();
  const { pending, syncing } = useSyncState();

  if (isImmersive(pathname) || (online && pending === 0)) return null;

  const onDownloads = pathname === '/offline';

  return (
    <PageSection className={cn('mb-6 sm:mb-8', className)}>
      <div
        role="status"
        data-slot="offline-banner"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-container-high px-4 py-3 text-body-sm text-on-surface"
      >
        {online ? (
          <RefreshCw aria-hidden className={cn('size-4 shrink-0 text-primary', syncing && 'animate-spin')} />
        ) : (
          <WifiOff aria-hidden className="size-4 shrink-0 text-on-surface-variant" />
        )}
        <span className="min-w-0 flex-1">
          {online ? (
            syncing ? (
              'Syncing your changes…'
            ) : (
              changesLabel(pending)
            )
          ) : (
            <>
              You&apos;re offline — downloaded books and decks still work.
              {pending > 0 && <span className="tabular text-on-surface-variant"> {changesLabel(pending)}.</span>}
            </>
          )}
        </span>
        {!online && !onDownloads && (
          <Link
            href="/offline"
            className="rounded-lg font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Downloads
          </Link>
        )}
      </div>
    </PageSection>
  );
}
