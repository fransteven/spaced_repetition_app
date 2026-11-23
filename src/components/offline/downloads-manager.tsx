'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { BookOpen, CircleX, Download, Layers, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { readCoverUrl, type OfflineBookRecord } from '@/lib/offline/book-files';
import type { OfflineDeckRecord } from '@/lib/offline/deck-download';
import { getUsage, requestPersistence, type StorageUsage } from '@/lib/offline/storage';
import { flush } from '@/lib/offline/sync';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/primitives/empty-state';
import { MasteryThread } from '@/components/primitives/mastery-thread';
import { Pill } from '@/components/primitives/pill';
import { SectionHeading } from '@/components/primitives/section-heading';
import { Surface } from '@/components/primitives/surface';
import { removeDownload } from '@/components/offline/download-store';
import { formatBytes } from '@/components/offline/format-bytes';
import { useDownloads } from '@/components/offline/use-download';
import { useSyncState } from '@/components/offline/use-sync-state';

function noopSubscribe(): () => void {
  return () => {};
}

/** iPhone / iPad Safari (iPadOS reports itself as a Mac with touch), not launched from the Home Screen. */
function isIosBrowserTab(): boolean {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true);
  return !standalone;
}

function relative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Library" / "Decks" links back into the app — only while online (those pages need the server). */
export function OnlineAppLinks({ className }: { className?: string }): React.JSX.Element | null {
  const online = useOnlineStatus();
  if (!online) return null;
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      <Link href="/library" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
        <BookOpen />
        Library
      </Link>
      <Link href="/decks" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
        <Layers />
        Decks
      </Link>
    </div>
  );
}

function StoragePanel({ refreshKey }: { refreshKey: unknown }): React.JSX.Element {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUsage()
      .then((next) => {
        if (!cancelled) setUsage(next);
      })
      .catch(() => {
        if (!cancelled) setUsage({ supported: false, usage: 0, quota: 0, persisted: false });
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const keepDownloads = async (): Promise<void> => {
    setAsking(true);
    const persisted = await requestPersistence();
    setAsking(false);
    if (persisted) toast.success('Downloads are protected from automatic cleanup');
    else
      toast.info('The browser did not allow it yet', {
        description: 'Installing NeuroCards as an app usually lets the browser keep your downloads.',
      });
    setUsage(await getUsage().catch(() => null));
  };

  const percent = usage && usage.quota > 0 ? (usage.usage / usage.quota) * 100 : 0;

  return (
    <Surface tone="panel" className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-headline-sm text-on-surface">Storage</h3>
        {usage?.persisted ? (
          <Pill tone="primary">
            <ShieldCheck aria-hidden className="size-3" />
            Protected
          </Pill>
        ) : (
          usage && <Pill tone="neutral">Not protected</Pill>
        )}
      </div>

      {!usage ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : usage.supported ? (
        <div className="space-y-2">
          <p className="text-body-md tabular text-on-surface">
            {formatBytes(usage.usage)} <span className="text-on-surface-variant">of {formatBytes(usage.quota)} used</span>
          </p>
          <MasteryThread value={percent} tone="primary" animate={false} />
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant">This browser does not report how much space is available.</p>
      )}

      {usage && !usage.persisted && (
        <div className="space-y-3">
          <p className="text-body-sm text-on-surface-variant">
            The browser may clear downloads when the device runs low on space.
          </p>
          <Button type="button" variant="secondary" size="lg" disabled={asking} onClick={() => void keepDownloads()}>
            <ShieldCheck />
            Keep downloads
          </Button>
        </div>
      )}
    </Surface>
  );
}

function SyncPanel(): React.JSX.Element {
  const online = useOnlineStatus();
  const { pending, syncing, lastResult } = useSyncState();

  const syncNow = async (): Promise<void> => {
    try {
      const result = await flush({ force: true });
      if (result.skipped) toast.info('Sync is already running');
      else if (result.failed > 0)
        toast.error(`${plural(result.failed, 'change')} could not be sent`, {
          description: 'They stay on this device and will be retried automatically.',
        });
      else if (result.sent > 0) toast.success(`Synced ${plural(result.sent, 'change')}`);
      else toast.success('Everything is up to date');
    } catch (error) {
      console.error('[offline] sync failed', error);
      toast.error('Sync failed');
    }
  };

  return (
    <Surface tone="panel" className="flex flex-col gap-4 p-5 sm:p-6">
      <h3 className="text-headline-sm text-on-surface">Sync</h3>
      <div className="space-y-1">
        <p className="text-body-md text-on-surface">
          {pending > 0 ? (
            <span className="tabular">{plural(pending, 'change')} waiting to sync</span>
          ) : (
            'All changes are synced'
          )}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          {!online
            ? 'Reviews, progress and notes made offline are sent when you reconnect.'
            : lastResult
              ? `Last synced ${relative(lastResult.finished_at)}`
              : 'Changes are sent automatically while you are online.'}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="self-start"
        disabled={!online || syncing}
        onClick={() => void syncNow()}
      >
        <RefreshCw className={cn(syncing && 'animate-spin')} />
        {syncing ? 'Syncing…' : 'Sync now'}
      </Button>
    </Surface>
  );
}

function BookCover({ book }: { book: OfflineBookRecord }): React.JSX.Element {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!book.has_cover) return;
    let cancelled = false;
    let created: string | null = null;
    readCoverUrl(book.id)
      .then((next) => {
        if (cancelled) {
          if (next) URL.revokeObjectURL(next);
          return;
        }
        created = next;
        setUrl(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [book.id, book.has_cover, book.downloaded_at]);

  return (
    <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container-high sm:w-16">
      {url ? (
        <Image src={url} alt="" fill unoptimized sizes="64px" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <BookOpen aria-hidden className="size-5 text-on-surface-variant" />
        </div>
      )}
    </div>
  );
}

function BookRow({ book }: { book: OfflineBookRecord }): React.JSX.Element {
  return (
    <Surface ghost className="flex gap-4 p-5 sm:p-6" data-slot="offline-book">
      <BookCover book={book} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 break-words text-headline-sm text-on-surface">{book.title}</h3>
          <p className="truncate text-body-sm text-on-surface-variant">
            {book.author ? `${book.author} · ` : ''}
            <span className="tabular">{formatBytes(book.bytes + book.cover_bytes)}</span>
          </p>
          <p className="text-label-sm text-on-surface-variant">Downloaded {relative(book.downloaded_at)}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Link
            href={`/offline/read?book=${encodeURIComponent(book.id)}`}
            className={buttonVariants({ size: 'lg' })}
          >
            <BookOpen />
            Read
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => void removeDownload('book', book.id, { label: book.title })}
          >
            <CircleX />
            Remove
          </Button>
        </div>
      </div>
    </Surface>
  );
}

function DeckRow({ deck }: { deck: OfflineDeckRecord }): React.JSX.Element {
  const missingImages = deck.image_urls.length - deck.image_count;
  return (
    <Surface ghost className="flex flex-col gap-3 p-5 sm:p-6" data-slot="offline-deck">
      <div className="min-w-0">
        <h3 className="break-words text-headline-sm text-on-surface">{deck.name}</h3>
        <p className="text-body-sm tabular text-on-surface-variant">
          {plural(deck.card_count, 'card')}
          {deck.image_count > 0 && ` · ${plural(deck.image_count, 'image')} (${formatBytes(deck.image_bytes)})`}
        </p>
        {missingImages > 0 && (
          <p className="text-body-sm text-on-surface-variant">
            {plural(missingImages, 'image')} could not be saved and will not show offline.
          </p>
        )}
        <p className="text-label-sm text-on-surface-variant">Downloaded {relative(deck.downloaded_at)}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Link href={`/offline/study?deck=${encodeURIComponent(deck.id)}`} className={buttonVariants({ size: 'lg' })}>
          <Layers />
          Study
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => void removeDownload('deck', deck.id, { label: deck.name })}
        >
          <CircleX />
          Remove
        </Button>
      </div>
    </Surface>
  );
}

/** The Downloads page (/offline): storage, sync status and everything saved on this device. */
export function DownloadsManager(): React.JSX.Element {
  const downloads = useDownloads();
  const showIosNotice = useSyncExternalStore(noopSubscribe, isIosBrowserTab, () => false);

  const books = [...downloads.books.values()].sort((a, b) => b.downloaded_at.localeCompare(a.downloaded_at));
  const decks = [...downloads.decks.values()].sort((a, b) => b.downloaded_at.localeCompare(a.downloaded_at));
  const bookBytes = books.reduce((sum, b) => sum + b.bytes + b.cover_bytes, 0);
  const deckBytes = decks.reduce((sum, d) => sum + d.image_bytes, 0);

  return (
    <div className="space-y-10 sm:space-y-12" data-slot="downloads-manager">
      {showIosNotice && (
        <Surface tone="panel" className="flex items-start gap-3 p-5 sm:p-6" role="note">
          <Smartphone aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-body-md font-semibold text-on-surface">
              Add NeuroCards to your Home Screen so Safari doesn&apos;t clear your downloads
            </p>
            <p className="text-body-sm text-on-surface-variant">
              In Safari, tap Share, then Add to Home Screen, and open NeuroCards from there.
            </p>
          </div>
        </Surface>
      )}

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <StoragePanel refreshKey={`${downloads.books.size}:${downloads.decks.size}:${bookBytes}:${deckBytes}`} />
        <SyncPanel />
      </div>

      {!downloads.loaded ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : !downloads.supported ? (
        <EmptyState
          icon={<Download />}
          title="Downloads are not available"
          body="This browser cannot store books and decks for offline use. Try a recent version of Chrome, Edge, Firefox or Safari."
        />
      ) : books.length === 0 && decks.length === 0 ? (
        <EmptyState
          icon={<Download />}
          title="No downloads yet"
          body="Download a book from your library or a deck to read and study without a connection."
        />
      ) : (
        <>
          {books.length > 0 && (
            <section>
              <SectionHeading
                title="Books"
                description={<span className="tabular">{`${plural(books.length, 'book')} · ${formatBytes(bookBytes)}`}</span>}
              />
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
                {books.map((book) => (
                  <BookRow key={book.id} book={book} />
                ))}
              </div>
            </section>
          )}
          {decks.length > 0 && (
            <section>
              <SectionHeading
                title="Decks"
                description={<span className="tabular">{`${plural(decks.length, 'deck')} · ${formatBytes(deckBytes)} of images`}</span>}
              />
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {decks.map((deck) => (
                  <DeckRow key={deck.id} deck={deck} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
