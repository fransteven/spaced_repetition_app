// In-memory view of what this device has downloaded, plus the downloads in flight. Shared by the
// library/deck cards and the Downloads page so a download started in one place shows everywhere
// (and keeps running across client navigations). Browser only.
import { toast } from 'sonner';

import { deleteBook, downloadBook, listBooks, type OfflineBookRecord } from '@/lib/offline/book-files';
import { deleteDeck, downloadDeck, listDecks, type OfflineDeckRecord } from '@/lib/offline/deck-download';
import { OfflineHttpError } from '@/lib/offline/fetch-json';
import { InsufficientStorageError } from '@/lib/offline/storage';
import { formatBytes } from '@/components/offline/format-bytes';

export type DownloadKind = 'book' | 'deck';

export interface DownloadsSnapshot {
  /** IndexedDB exists in this browser (downloads are possible at all). */
  supported: boolean;
  /** The downloaded lists were read at least once. */
  loaded: boolean;
  books: ReadonlyMap<string, OfflineBookRecord>;
  decks: ReadonlyMap<string, OfflineDeckRecord>;
  /** `kind:id` → percent (0-100), or null while the total is unknown. */
  active: ReadonlyMap<string, number | null>;
  /** `kind:id` of downloads whose last attempt failed. */
  failed: ReadonlySet<string>;
}

const SERVER_SNAPSHOT: DownloadsSnapshot = {
  supported: false,
  loaded: false,
  books: new Map(),
  decks: new Map(),
  active: new Map(),
  failed: new Set(),
};

let snapshot: DownloadsSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
const controllers = new Map<string, AbortController>();
let loading: Promise<void> | null = null;

function setSnapshot(patch: Partial<DownloadsSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  for (const fn of listeners) fn();
}

export function downloadKey(kind: DownloadKind, id: string): string {
  return `${kind}:${id}`;
}

export function subscribeDownloads(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getDownloadsSnapshot(): DownloadsSnapshot {
  return snapshot;
}

export function getDownloadsServerSnapshot(): DownloadsSnapshot {
  return SERVER_SNAPSHOT;
}

/** Reads the downloaded books and decks (once, unless `force`). */
export function loadDownloads(force = false): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loading && !force) return loading;
  const run = (async (): Promise<void> => {
    if (typeof indexedDB === 'undefined') {
      setSnapshot({ supported: false, loaded: true });
      return;
    }
    try {
      const [books, decks] = await Promise.all([listBooks(), listDecks()]);
      setSnapshot({
        supported: true,
        loaded: true,
        books: new Map(books.map((b) => [b.id, b])),
        decks: new Map(decks.map((d) => [d.id, d])),
      });
    } catch (error) {
      console.warn('[offline] could not read downloads', error);
      setSnapshot({ supported: false, loaded: true });
    }
  })();
  loading = run;
  return run;
}

function withActive(key: string, value: number | null | undefined): Map<string, number | null> {
  const next = new Map(snapshot.active);
  if (value === undefined) next.delete(key);
  else next.set(key, value);
  return next;
}

function withFailed(key: string, failed: boolean): Set<string> {
  const next = new Set(snapshot.failed);
  if (failed) next.add(key);
  else next.delete(key);
  return next;
}

function reportError(error: unknown, label: string): void {
  if (error instanceof InsufficientStorageError) {
    toast.error('Not enough storage', {
      description: `“${label}” needs ${formatBytes(error.needed)}, but only ${formatBytes(error.available)} is free on this device.`,
    });
    return;
  }
  if (error instanceof OfflineHttpError) {
    toast.error('Download failed', {
      description: error.status === 404 ? `“${label}” is no longer available.` : error.message,
    });
    return;
  }
  if (error instanceof TypeError) {
    toast.error('Download failed', { description: 'Check your connection and try again.' });
    return;
  }
  toast.error('Download failed', {
    description: error instanceof Error ? error.message : `“${label}” could not be saved on this device.`,
  });
}

export interface StartDownloadOptions {
  /** Shown in toasts. */
  label: string;
  /** Books only: skip the cover request when the book has none. */
  hasCover?: boolean;
}

/** Downloads (or re-downloads) a book or deck. Resolves when finished, cancelled or failed. */
export async function startDownload(
  kind: DownloadKind,
  id: string,
  ownerId: string,
  { label, hasCover }: StartDownloadOptions
): Promise<void> {
  const key = downloadKey(kind, id);
  if (controllers.has(key)) return;
  const controller = new AbortController();
  controllers.set(key, controller);
  setSnapshot({ active: withActive(key, 0), failed: withFailed(key, false) });

  let lastPercent: number | null = 0;
  const report = (percent: number | null): void => {
    if (percent === lastPercent || controller.signal.aborted) return;
    lastPercent = percent;
    setSnapshot({ active: withActive(key, percent) });
  };

  try {
    if (kind === 'book') {
      const record = await downloadBook(id, ownerId, {
        signal: controller.signal,
        hasCover,
        onProgress: ({ phase, loaded, total }) => {
          if (phase === 'snapshot') report(0);
          else if (phase === 'file') report(total > 0 ? Math.min(99, Math.floor((loaded / total) * 100)) : null);
          else report(phase === 'cover' ? 99 : 100);
        },
      });
      const books = new Map(snapshot.books);
      books.set(id, record);
      setSnapshot({ books, active: withActive(key, undefined) });
    } else {
      const record = await downloadDeck(id, ownerId, {
        signal: controller.signal,
        onProgress: ({ phase, loaded, total }) => {
          if (phase === 'snapshot') report(0);
          else if (phase === 'images') report(total > 0 ? Math.min(99, Math.floor((loaded / total) * 100)) : null);
          else report(100);
        },
      });
      const decks = new Map(snapshot.decks);
      decks.set(id, record);
      setSnapshot({ decks, active: withActive(key, undefined) });
    }
    toast.success(`“${label}” is available offline`);
  } catch (error) {
    if (controller.signal.aborted) {
      // Cancelled: the download layer already removed the partial copy.
      const patch: Partial<DownloadsSnapshot> = { active: withActive(key, undefined) };
      if (kind === 'book' && snapshot.books.has(id)) {
        const books = new Map(snapshot.books);
        books.delete(id);
        patch.books = books;
      }
      if (kind === 'deck' && snapshot.decks.has(id)) {
        const decks = new Map(snapshot.decks);
        decks.delete(id);
        patch.decks = decks;
      }
      setSnapshot(patch);
      return;
    }
    console.error(`[offline] ${kind} download failed`, error);
    reportError(error, label);
    // A failed re-download also removes the previous copy (see downloadBook / downloadDeck).
    setSnapshot({ active: withActive(key, undefined), failed: withFailed(key, true) });
    void loadDownloads(true);
  } finally {
    controllers.delete(key);
  }
}

export function cancelDownload(kind: DownloadKind, id: string): void {
  controllers.get(downloadKey(kind, id))?.abort();
}

/** Cancels every download in flight (before signing out / wiping). */
export function abortAllDownloads(): void {
  for (const controller of controllers.values()) controller.abort();
}

/** Removes the local copy. `silent` skips the toast (e.g. after deleting the book itself). */
export async function removeDownload(
  kind: DownloadKind,
  id: string,
  { label, silent = false }: { label?: string; silent?: boolean } = {}
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  cancelDownload(kind, id);
  try {
    if (kind === 'book') await deleteBook(id);
    else await deleteDeck(id);
  } catch (error) {
    console.error(`[offline] could not remove ${kind} download`, error);
    if (!silent) toast.error('Could not remove the download');
    return;
  }
  const key = downloadKey(kind, id);
  const patch: Partial<DownloadsSnapshot> = { failed: withFailed(key, false) };
  if (kind === 'book') {
    const books = new Map(snapshot.books);
    books.delete(id);
    patch.books = books;
  } else {
    const decks = new Map(snapshot.decks);
    decks.delete(id);
    patch.decks = decks;
  }
  setSnapshot(patch);
  if (!silent) toast.success(label ? `Removed “${label}” from this device` : 'Download removed');
}

/** After a wipe (owner change, sign-out): forget everything and re-read the (now empty) store. */
export function resetDownloads(): Promise<void> {
  abortAllDownloads();
  setSnapshot({ books: new Map(), decks: new Map(), active: new Map(), failed: new Set() });
  return loadDownloads(true);
}
