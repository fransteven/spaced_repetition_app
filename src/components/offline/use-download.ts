'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';

import { useOnlineStatus } from '@/lib/offline/use-online-status';
import {
  cancelDownload,
  downloadKey,
  getDownloadsServerSnapshot,
  getDownloadsSnapshot,
  loadDownloads,
  removeDownload,
  startDownload,
  subscribeDownloads,
  type DownloadKind,
  type DownloadsSnapshot,
} from '@/components/offline/download-store';

export type DownloadStatus = 'unknown' | 'idle' | 'downloading' | 'downloaded' | 'error';

export interface UseDownloadResult {
  status: DownloadStatus;
  /** 0-100 while downloading, null when the size is not known yet. */
  progress: number | null;
  /** Online, signed in, and this browser can store downloads. */
  canDownload: boolean;
  online: boolean;
  download: () => void;
  cancel: () => void;
  remove: () => void;
}

/** Downloaded books/decks of this device, kept in sync with every download and removal. */
export function useDownloads(): DownloadsSnapshot {
  const snapshot = useSyncExternalStore(subscribeDownloads, getDownloadsSnapshot, getDownloadsServerSnapshot);
  useEffect(() => {
    void loadDownloads();
  }, []);
  return snapshot;
}

/** Offline download state + actions for one book or deck. */
export function useDownload(
  kind: DownloadKind,
  id: string,
  { label, hasCover }: { label: string; hasCover?: boolean }
): UseDownloadResult {
  const snapshot = useDownloads();
  const online = useOnlineStatus();
  const { data: session, status: sessionStatus } = useSession();
  const ownerId = sessionStatus === 'authenticated' ? session?.user?.id : undefined;

  const key = downloadKey(kind, id);
  const downloaded = kind === 'book' ? snapshot.books.has(id) : snapshot.decks.has(id);
  const status: DownloadStatus = !snapshot.loaded
    ? 'unknown'
    : snapshot.active.has(key)
      ? 'downloading'
      : downloaded
        ? 'downloaded'
        : snapshot.failed.has(key)
          ? 'error'
          : 'idle';

  const download = useCallback((): void => {
    if (!ownerId) return;
    void startDownload(kind, id, ownerId, { label, hasCover });
  }, [hasCover, id, kind, label, ownerId]);
  const cancel = useCallback((): void => cancelDownload(kind, id), [id, kind]);
  const remove = useCallback((): void => {
    void removeDownload(kind, id, { label });
  }, [id, kind, label]);

  return {
    status,
    progress: snapshot.active.get(key) ?? null,
    canDownload: snapshot.supported && online && ownerId !== undefined,
    online,
    download,
    cancel,
    remove,
  };
}
